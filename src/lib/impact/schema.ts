import { z } from 'zod';

/**
 * The shape of the public totals spreadsheet (CLAUDE.md, "Impact data
 * contract"). Only these two tabs are ever read, and the whole fetch is
 * rejected if either one does not match: a half-understood sheet must never
 * reach a page.
 */

export const TOTALS_RANGE = 'Totals!A:H';
export const MONTHLY_RANGE = 'Monthly!A:D';

/** Column order is part of the contract, so the header row is validated too. */
export const TOTALS_HEADERS = [
  'metric_id',
  'label_mn',
  'label_en',
  'value',
  'n_cases',
  'as_of',
  'method_anchor',
  'show_on_home',
] as const;

export const MONTHLY_HEADERS = ['month', 'metric_id', 'value', 'n_cases'] as const;

const metricId = z
  .string()
  .trim()
  .min(1)
  .regex(/^[a-z0-9]+(?:[-_][a-z0-9]+)*$/, 'metric_id: lowercase letters, digits, - or _');

const isoDate = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'as_of must be YYYY-MM-DD')
  .refine((value) => !Number.isNaN(Date.parse(value)), 'as_of is not a real date');

const month = z
  .string()
  .trim()
  .regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'month must be YYYY-MM');

const anchorId = z
  .string()
  .trim()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'method_anchor must be a URL fragment');

/**
 * Sheets returns numbers as numbers with UNFORMATTED_VALUE, but a cell someone
 * typed by hand can still arrive as a string. Blank stays blank — it is not
 * silently read as zero, which would turn "no data" into a published figure.
 */
const sheetNumber = z.union([
  z.number().finite(),
  z
    .string()
    .trim()
    .transform((value, ctx) => {
      if (value === '') return null;
      const parsed = Number(value.replace(/\s/g, '').replace(/,/g, ''));
      if (Number.isNaN(parsed)) {
        ctx.addIssue({ code: 'custom', message: 'not a number' });
        return z.NEVER;
      }
      return parsed;
    }),
  z.null(),
  z.undefined().transform(() => null),
]);

const caseCount = sheetNumber.refine(
  (value) => value === null || (Number.isInteger(value) && value >= 0),
  'n_cases must be a whole number of cases',
);

const sheetBoolean = z
  .union([z.boolean(), z.string(), z.null(), z.undefined()])
  .transform((value) => {
    if (typeof value === 'boolean') return value;
    return typeof value === 'string' && value.trim().toUpperCase() === 'TRUE';
  });

export const totalRowSchema = z.object({
  metric_id: metricId,
  label_mn: z.string().trim().min(1, 'label_mn is required'),
  label_en: z.string().trim().min(1, 'label_en is required'),
  value: sheetNumber,
  n_cases: caseCount,
  as_of: isoDate,
  method_anchor: anchorId,
  show_on_home: sheetBoolean,
});

export const monthlyRowSchema = z.object({
  month,
  metric_id: metricId,
  value: sheetNumber,
  n_cases: caseCount,
});

export const totalsSchema = z
  .array(totalRowSchema)
  .min(1, 'the Totals tab has no rows')
  .superRefine((rows, ctx) => {
    const seen = new Set<string>();
    for (const row of rows) {
      if (seen.has(row.metric_id)) {
        ctx.addIssue({
          code: 'custom',
          message: `duplicate metric_id: ${row.metric_id}`,
        });
      }
      seen.add(row.metric_id);
    }
  });

export const monthlySchema = z.array(monthlyRowSchema).superRefine((rows, ctx) => {
  const seen = new Set<string>();
  for (const row of rows) {
    const key = `${row.metric_id}:${row.month}`;
    if (seen.has(key)) {
      ctx.addIssue({ code: 'custom', message: `duplicate month for a metric: ${key}` });
    }
    seen.add(key);
  }
});

export type TotalRow = z.infer<typeof totalRowSchema>;
export type MonthlyRow = z.infer<typeof monthlyRowSchema>;

/**
 * Turns the raw `values` grid into objects keyed by the contract's column
 * names. The header row must match exactly: a renamed or reordered column is a
 * contract change, not something to guess at.
 */
export function rowsToObjects(
  grid: unknown[][] | undefined,
  headers: readonly string[],
  tab: string,
): Record<string, unknown>[] {
  const rows = grid ?? [];
  const header = (rows[0] ?? []).map((cell) =>
    String(cell ?? '')
      .trim()
      .toLowerCase(),
  );

  if (header.length < headers.length || headers.some((name, i) => header[i] !== name)) {
    throw new Error(
      `${tab}: unexpected columns. Expected ${headers.join(', ')} in that order.`,
    );
  }

  return (
    rows
      .slice(1)
      // A trailing blank row is normal in a spreadsheet; it is not an error.
      .filter((row) => row.some((cell) => String(cell ?? '').trim() !== ''))
      .map((row) => Object.fromEntries(headers.map((name, i) => [name, row[i]])))
  );
}

export type ParsedSheet = {
  totals: TotalRow[];
  monthly: MonthlyRow[];
};

/**
 * Validates both tabs. Throws on the first problem — a partially understood
 * sheet is never published, so there is no "best effort" path here.
 */
export function parseSheet(values: {
  totals?: unknown[][];
  monthly?: unknown[][];
}): ParsedSheet {
  const totals = totalsSchema.parse(
    rowsToObjects(values.totals, TOTALS_HEADERS, 'Totals'),
  );
  const monthly = monthlySchema.parse(
    rowsToObjects(values.monthly, MONTHLY_HEADERS, 'Monthly'),
  );

  const known = new Set(totals.map((row) => row.metric_id));
  const orphan = monthly.find((row) => !known.has(row.metric_id));
  if (orphan) {
    throw new Error(
      `Monthly references a metric_id that is not in Totals: ${orphan.metric_id}`,
    );
  }

  return { totals, monthly };
}

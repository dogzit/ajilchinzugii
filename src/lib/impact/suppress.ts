import type { ParsedSheet } from './schema';

/**
 * Small-cell suppression (CLAUDE.md rule 2).
 *
 * Any figure resting on fewer than five cases is never rendered as a number.
 * Two things make this safe rather than decorative:
 *
 *  - every cell is judged on its own `n_cases`, headline totals and monthly
 *    points alike, so a suppressed month cannot be read off a visible one;
 *  - nothing here adds anything up. The headline totals are the sheet's own
 *    totals. If this file summed the monthly points instead, a reader could
 *    subtract the visible months from the total and recover the suppressed
 *    one, which is exactly the disclosure the rule exists to prevent.
 */

export const SMALL_CELL_THRESHOLD = 5;

export type ImpactMetric = {
  metricId: string;
  labelMn: string;
  labelEn: string;
  /** null when suppressed, or when the sheet left the cell empty. */
  value: number | null;
  /** True only for small-cell suppression, never for a missing value. */
  suppressed: boolean;
  /** Withheld for a suppressed cell: the exact count is itself a small number. */
  nCases: number | null;
  asOf: string;
  methodAnchor: string;
  showOnHome: boolean;
};

export type ImpactMonthlyPoint = {
  month: string;
  metricId: string;
  value: number | null;
  suppressed: boolean;
  nCases: number | null;
};

export type SuppressedSheet = {
  metrics: ImpactMetric[];
  monthly: ImpactMonthlyPoint[];
};

/**
 * The only transformation applied between the sheet and the page. Pure: same
 * input, same output, no clock, no network, no database.
 */
export function suppressSmallCells(parsed: ParsedSheet): SuppressedSheet {
  // A missing n_cases is treated as too small: an unknown denominator is never
  // evidence that five or more cases stand behind a figure.
  const isSuppressed = (nCases: number | null) =>
    nCases === null || nCases < SMALL_CELL_THRESHOLD;

  return {
    metrics: parsed.totals.map((row) => {
      const suppressed = isSuppressed(row.n_cases);
      return {
        metricId: row.metric_id,
        labelMn: row.label_mn,
        labelEn: row.label_en,
        value: suppressed ? null : row.value,
        suppressed,
        nCases: suppressed ? null : row.n_cases,
        asOf: row.as_of,
        methodAnchor: row.method_anchor,
        showOnHome: row.show_on_home,
      };
    }),
    monthly: parsed.monthly.map((row) => {
      const suppressed = isSuppressed(row.n_cases);
      return {
        month: row.month,
        metricId: row.metric_id,
        value: suppressed ? null : row.value,
        suppressed,
        nCases: suppressed ? null : row.n_cases,
      };
    }),
  };
}

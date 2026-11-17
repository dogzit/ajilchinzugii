import { MONTHLY_HEADERS, TOTALS_HEADERS } from './schema';

/**
 * Stand-in figures for the impact pages, for as long as the Google Sheet has
 * not been connected.
 *
 * **These numbers are invented.** They describe no real case, no real
 * negotiation and no real worker. They exist so the impact pages can be
 * designed, reviewed and demonstrated against something of the right shape,
 * rather than against the empty state.
 *
 * They are kept out of the published site by `IMPACT_SAMPLE`, which is set on
 * the workers.dev deployment and nowhere else. The live site shows its "no
 * figures yet" state until the sheet is connected, because CLAUDE.md's first
 * line is that every published number must be checkable against its
 * evidence, and these are not — the readers are funders and the labour
 * ministry, who have no way to tell an invented figure from a counted one.
 *
 * Nothing here is written to the database either (see `loadImpact`), so a
 * sample figure cannot reach production even by accident.
 *
 * The rows are shaped exactly as the spreadsheet's, so they go through the
 * same zod validation, the same small-cell suppression and the same
 * localisation as real data would. That is the point: the pages are
 * exercised, not bypassed.
 *
 * Every `method_anchor` below names a counting rule that actually exists in
 * the methodology (`COUNTING_RULES` in `seed-org.ts`). An anchor that does
 * not resolve would leave "How is this counted?" pointing at nothing, which
 * is the one thing on this page a skeptical reader is most likely to click.
 */

/**
 * Deliberately includes a metric below the suppression threshold.
 * `hazardous-work-ended` is built from 3 cases, so rule 2 should replace its
 * value with the "5-aas tsoon / Fewer than 5" label — if the pages ever show
 * a number there, suppression has broken.
 */
const TOTALS: (string | number | boolean)[][] = [
  [...TOTALS_HEADERS],
  [
    'cases-resolved',
    'Шийдвэрлэсэн хэрэг',
    'Cases resolved',
    274,
    274,
    '2026-10-31',
    'counting-case-open-close',
    'TRUE',
  ],
  [
    // Wages are counted at verification, not when they are promised, so this
    // is far fewer cases than the resolved total: a wage claim is one kind of
    // case among several, and only the paid ones count. 11 cases against
    // ₮6,000,000 is roughly a month's pay recovered each, which is the shape
    // a reader who divides one figure by the other should find.
    'wages-recovered',
    'Нөхөн олгуулсан цалин (₮)',
    'Wages recovered (₮)',
    6_000_000,
    11,
    '2026-10-31',
    'counting-money-hours-verified',
    'TRUE',
  ],
  [
    'teens-represented',
    'Төлөөлсөн хүүхэд, залуучууд',
    'Children and teens represented',
    411,
    411,
    '2026-10-31',
    'counting-people-once',
    'TRUE',
  ],
  [
    'hazardous-work-ended',
    'Аюултай ажлаас гаргасан',
    'Taken out of hazardous work',
    3,
    3,
    '2026-10-31',
    'counting-outcomes-once',
    'FALSE',
  ],
  [
    'employers-engaged',
    'Хамтран ажилласан ажил олгогч',
    'Employers engaged',
    27,
    27,
    '2026-09-30',
    'counting-contacts-every-time',
    'FALSE',
  ],
];

/**
 * Twelve months, rising unevenly — a straight line would read as invented.
 * Each series sums to its own headline total, so a reader who adds the bars
 * up gets the number on the card.
 */
const MONTHLY_SHAPE: Record<string, number[]> = {
  'cases-resolved': [14, 18, 15, 22, 20, 25, 19, 28, 24, 30, 28, 31],
  'teens-represented': [20, 27, 23, 33, 30, 38, 29, 42, 36, 45, 42, 46],
};

const MONTHS = [
  '2025-11',
  '2025-12',
  '2026-01',
  '2026-02',
  '2026-03',
  '2026-04',
  '2026-05',
  '2026-06',
  '2026-07',
  '2026-08',
  '2026-09',
  '2026-10',
];

const MONTHLY: (string | number)[][] = [
  [...MONTHLY_HEADERS],
  ...Object.entries(MONTHLY_SHAPE).flatMap(([metricId, values]) =>
    values.map((value, index) => [MONTHS[index]!, metricId, value, value]),
  ),
];

/** True when this deployment should serve the stand-in figures. */
export const sampleImpactEnabled = (): boolean =>
  process.env.IMPACT_SAMPLE?.trim() === 'true';

export const sampleSheetValues = () => ({
  totals: TOTALS as unknown[][],
  monthly: MONTHLY as unknown[][],
});

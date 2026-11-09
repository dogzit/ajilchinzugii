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
    146,
    146,
    '2026-10-31',
    'counting-cases',
    'TRUE',
  ],
  [
    'wages-recovered',
    'Нөхөн олгуулсан цалин (₮)',
    'Wages recovered (₮)',
    48_350_000,
    112,
    '2026-10-31',
    'counting-wages',
    'TRUE',
  ],
  [
    'agreements-signed',
    'Байгуулсан гэрээ',
    'Agreements signed',
    63,
    63,
    '2026-10-31',
    'counting-agreements',
    'TRUE',
  ],
  [
    'teens-represented',
    'Төлөөлсөн хүүхэд, залуучууд',
    'Children and teens represented',
    311,
    311,
    '2026-10-31',
    'counting-cases',
    'TRUE',
  ],
  [
    'hazardous-work-ended',
    'Аюултай ажлаас гаргасан',
    'Taken out of hazardous work',
    3,
    3,
    '2026-10-31',
    'counting-cases',
    'FALSE',
  ],
  [
    'employers-engaged',
    'Хамтран ажилласан ажил олгогч',
    'Employers engaged',
    27,
    27,
    '2026-09-30',
    'counting-agreements',
    'FALSE',
  ],
];

/** Twelve months, rising unevenly — a straight line would read as invented. */
const MONTHLY_SHAPE: Record<string, number[]> = {
  'cases-resolved': [6, 9, 7, 12, 11, 14, 10, 15, 13, 17, 16, 16],
  'agreements-signed': [2, 4, 3, 6, 5, 7, 4, 8, 6, 7, 5, 6],
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

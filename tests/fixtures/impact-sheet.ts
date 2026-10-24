/**
 * Fixtures shaped exactly like a Google Sheets `values.batchGet` response:
 * a header row followed by data rows, numbers unformatted.
 */

export const TOTALS_HEADER = [
  'metric_id',
  'label_mn',
  'label_en',
  'value',
  'n_cases',
  'as_of',
  'method_anchor',
  'show_on_home',
];

export const MONTHLY_HEADER = ['month', 'metric_id', 'value', 'n_cases'];

/**
 * Three metrics covering the suppression boundary:
 *  - cases-resolved: n = 42, shown
 *  - wage-recovered: n = 5, shown (5 is the threshold, not below it)
 *  - contracts-signed: n = 4, suppressed
 */
export const totalsRows = [
  TOTALS_HEADER,
  [
    'cases-resolved',
    'Шийдвэрлэсэн хэрэг',
    'Cases resolved',
    42,
    42,
    '2026-09-30',
    'counting-cases',
    'TRUE',
  ],
  [
    'wage-recovered',
    'Нөхөн олгуулсан цалин',
    'Wages recovered',
    7_450_000,
    5,
    '2026-09-30',
    'counting-wages',
    'TRUE',
  ],
  [
    'contracts-signed',
    'Байгуулсан гэрээ',
    'Contracts signed',
    4,
    4,
    '2026-09-30',
    'counting-contracts',
    'FALSE',
  ],
];

export const monthlyRows = [
  MONTHLY_HEADER,
  ['2026-07', 'cases-resolved', 12, 12],
  // Suppressed on its own: the yearly total above stays visible.
  ['2026-08', 'cases-resolved', 3, 3],
  ['2026-09', 'cases-resolved', 27, 27],
  // n_cases left blank — unknown denominators are suppressed too.
  ['2026-09', 'wage-recovered', 7_450_000, ''],
];

export const sheetValues = { totals: totalsRows, monthly: monthlyRows };

/** A metric whose n_cases cell was never filled in. */
export const totalsWithMissingN = [
  TOTALS_HEADER,
  [
    'cases-resolved',
    'Шийдвэрлэсэн хэрэг',
    'Cases resolved',
    42,
    '',
    '2026-09-30',
    'counting-cases',
    'TRUE',
  ],
];

/** The as_of column holds something that is not a date. */
export const totalsWithBadDate = [
  TOTALS_HEADER,
  [
    'cases-resolved',
    'Шийдвэрлэсэн хэрэг',
    'Cases resolved',
    42,
    42,
    'Sep 2026',
    'counting-cases',
    'TRUE',
  ],
];

/** Someone reordered the columns in the spreadsheet. */
export const totalsWithSwappedColumns = [
  [
    'metric_id',
    'label_en',
    'label_mn',
    'value',
    'n_cases',
    'as_of',
    'method_anchor',
    'show_on_home',
  ],
  [
    'cases-resolved',
    'Cases resolved',
    'Шийдвэрлэсэн хэрэг',
    42,
    42,
    '2026-09-30',
    'counting-cases',
    'TRUE',
  ],
];

/** A row whose value cell holds text. */
export const totalsWithTextValue = [
  TOTALS_HEADER,
  [
    'cases-resolved',
    'Шийдвэрлэсэн хэрэг',
    'Cases resolved',
    'олон',
    42,
    '2026-09-30',
    'counting-cases',
    'TRUE',
  ],
];

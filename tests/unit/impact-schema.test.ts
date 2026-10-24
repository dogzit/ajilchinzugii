// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { parseSheet } from '../../src/lib/impact/schema';
import {
  MONTHLY_HEADER,
  monthlyRows,
  sheetValues,
  TOTALS_HEADER,
  totalsRows,
  totalsWithBadDate,
  totalsWithMissingN,
  totalsWithSwappedColumns,
  totalsWithTextValue,
} from '../fixtures/impact-sheet';

describe('parsing a well-formed sheet', () => {
  const parsed = parseSheet(sheetValues);

  it('reads every data row and skips the header', () => {
    expect(parsed.totals).toHaveLength(3);
    expect(parsed.monthly).toHaveLength(4);
  });

  it('keeps both languages and the contract fields', () => {
    expect(parsed.totals[0]).toEqual({
      metric_id: 'cases-resolved',
      label_mn: 'Шийдвэрлэсэн хэрэг',
      label_en: 'Cases resolved',
      value: 42,
      n_cases: 42,
      as_of: '2026-09-30',
      method_anchor: 'counting-cases',
      show_on_home: true,
    });
  });

  it('reads an empty n_cases as unknown rather than zero', () => {
    expect(parsed.monthly[3]?.n_cases).toBeNull();
  });

  it('ignores trailing blank rows', () => {
    const withBlanks = parseSheet({
      totals: [...totalsRows, ['', '', '', '', '', '', '', ''], []],
      monthly: monthlyRows,
    });
    expect(withBlanks.totals).toHaveLength(3);
  });
});

describe('a broken sheet is rejected whole', () => {
  it('rejects a bad as_of date', () => {
    expect(() =>
      parseSheet({ totals: totalsWithBadDate, monthly: [MONTHLY_HEADER] }),
    ).toThrow();
  });

  it('rejects text where a number belongs', () => {
    expect(() =>
      parseSheet({ totals: totalsWithTextValue, monthly: [MONTHLY_HEADER] }),
    ).toThrow();
  });

  it('rejects reordered columns instead of mixing up the languages', () => {
    expect(() =>
      parseSheet({ totals: totalsWithSwappedColumns, monthly: [MONTHLY_HEADER] }),
    ).toThrow(/unexpected columns/);
  });

  it('rejects a renamed tab header', () => {
    const renamed = [['metric', ...TOTALS_HEADER.slice(1)], ...totalsRows.slice(1)];
    expect(() => parseSheet({ totals: renamed, monthly: [MONTHLY_HEADER] })).toThrow(
      /unexpected columns/,
    );
  });

  it('rejects a duplicated metric_id', () => {
    expect(() =>
      parseSheet({
        totals: [...totalsRows, totalsRows[1] as unknown[]],
        monthly: [MONTHLY_HEADER],
      }),
    ).toThrow(/duplicate metric_id/);
  });

  it('rejects a monthly row for a metric that is not in Totals', () => {
    expect(() =>
      parseSheet({
        totals: totalsRows,
        monthly: [MONTHLY_HEADER, ['2026-09', 'invented-metric', 5, 9]],
      }),
    ).toThrow(/not in Totals/);
  });

  it('rejects a malformed month', () => {
    expect(() =>
      parseSheet({
        totals: totalsRows,
        monthly: [MONTHLY_HEADER, ['2026-13', 'cases-resolved', 5, 9]],
      }),
    ).toThrow();
  });

  it('rejects an empty Totals tab', () => {
    expect(() =>
      parseSheet({ totals: [TOTALS_HEADER], monthly: [MONTHLY_HEADER] }),
    ).toThrow();
  });

  it('rejects a missing tab outright', () => {
    expect(() => parseSheet({ monthly: monthlyRows })).toThrow(/unexpected columns/);
  });

  it('accepts a missing n_cases — that is suppression, not a schema break', () => {
    expect(() =>
      parseSheet({ totals: totalsWithMissingN, monthly: [MONTHLY_HEADER] }),
    ).not.toThrow();
  });
});

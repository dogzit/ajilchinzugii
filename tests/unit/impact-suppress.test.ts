// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { parseSheet } from '../../src/lib/impact/schema';
import { SMALL_CELL_THRESHOLD, suppressSmallCells } from '../../src/lib/impact/suppress';
import { monthlyRows, sheetValues, totalsRows } from '../fixtures/impact-sheet';

const suppressed = suppressSmallCells(parseSheet(sheetValues));
const metric = (id: string) => suppressed.metrics.find((m) => m.metricId === id)!;
const point = (id: string, month: string) =>
  suppressed.monthly.find((p) => p.metricId === id && p.month === month)!;

describe('small-cell suppression', () => {
  it('uses a threshold of 5', () => {
    expect(SMALL_CELL_THRESHOLD).toBe(5);
  });

  it('suppresses a figure resting on 4 cases', () => {
    expect(metric('contracts-signed')).toMatchObject({
      value: null,
      suppressed: true,
      nCases: null,
    });
  });

  it('shows a figure resting on exactly 5 cases', () => {
    expect(metric('wage-recovered')).toMatchObject({
      value: 7_450_000,
      suppressed: false,
      nCases: 5,
    });
  });

  it('shows a figure well above the threshold', () => {
    expect(metric('cases-resolved')).toMatchObject({
      value: 42,
      suppressed: false,
      nCases: 42,
    });
  });

  it('suppresses when n_cases is missing', () => {
    expect(point('wage-recovered', '2026-09')).toMatchObject({
      value: null,
      suppressed: true,
      nCases: null,
    });
  });

  it('withholds the case count of a suppressed cell', () => {
    // Publishing "n = 4" would disclose the small cell the rule hides.
    for (const row of [...suppressed.metrics, ...suppressed.monthly]) {
      if (row.suppressed) expect(row.nCases).toBeNull();
    }
  });

  it('keeps labels and the method anchor on a suppressed metric', () => {
    // The row still renders — as "fewer than 5", with its evidence link.
    expect(metric('contracts-signed')).toMatchObject({
      labelMn: 'Байгуулсан гэрээ',
      labelEn: 'Contracts signed',
      methodAnchor: 'counting-contracts',
      asOf: '2026-09-30',
    });
  });
});

describe('monthly points are judged on their own', () => {
  it('suppresses one month without touching its neighbours', () => {
    expect(point('cases-resolved', '2026-08')).toMatchObject({
      value: null,
      suppressed: true,
    });
    expect(point('cases-resolved', '2026-07')).toMatchObject({
      value: 12,
      suppressed: false,
    });
    expect(point('cases-resolved', '2026-09')).toMatchObject({
      value: 27,
      suppressed: false,
    });
  });

  it('never derives a total by summing the months', () => {
    // 12 + 3 + 27 = 42 happens to equal the sheet's total. The suppressed
    // month must not be recoverable as total - visible months, so the total
    // has to come from the sheet, which is what this asserts: changing the
    // sheet's own total changes the output, summing the months would not.
    const tampered = structuredClone(totalsRows);
    (tampered[1] as unknown[])[3] = 999;

    const result = suppressSmallCells(
      parseSheet({ totals: tampered, monthly: monthlyRows }),
    );
    expect(result.metrics.find((m) => m.metricId === 'cases-resolved')?.value).toBe(999);
  });

  it('is pure: the same input gives the same output and mutates nothing', () => {
    const input = parseSheet(sheetValues);
    const before = structuredClone(input);
    const first = suppressSmallCells(input);
    const second = suppressSmallCells(input);

    expect(first).toEqual(second);
    expect(input).toEqual(before);
  });
});

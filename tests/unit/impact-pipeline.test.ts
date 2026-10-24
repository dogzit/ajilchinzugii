// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { sheetValues, totalsWithBadDate, MONTHLY_HEADER } from '../fixtures/impact-sheet';

const fetchSheetValues = vi.fn();
const findGlobal = vi.fn();
const updateGlobal = vi.fn();

vi.mock('../../src/lib/impact/client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/lib/impact/client')>();
  return { ...actual, fetchSheetValues: () => fetchSheetValues() };
});

// The config is never exercised here; only the Local API calls matter.
vi.mock('../../src/payload.config', () => ({ default: {} }));
vi.mock('payload', () => ({
  getPayload: async () => ({ findGlobal, updateGlobal }),
}));

const { loadImpact, snapshotHash } = await import('../../src/lib/impact/index');

const storedSnapshot = () => updateGlobal.mock.calls[0]?.[0]?.data?.data;

beforeEach(() => {
  vi.clearAllMocks();
  findGlobal.mockResolvedValue({ data: null });
  updateGlobal.mockResolvedValue({});
  fetchSheetValues.mockResolvedValue(sheetValues);
});

describe('a successful fetch', () => {
  it('returns suppressed, localized figures and is not stale', async () => {
    const view = await loadImpact('mn');

    expect(view.stale).toBe(false);
    expect(view.fetchedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(view.metrics.map((m) => m.label)).toEqual([
      'Шийдвэрлэсэн хэрэг',
      'Нөхөн олгуулсан цалин',
      'Байгуулсан гэрээ',
    ]);
    expect(view.metrics[2]).toMatchObject({
      value: null,
      suppressed: true,
      nCases: null,
    });
  });

  it('localizes to English and links each figure to its counting rule', async () => {
    const view = await loadImpact('en');

    expect(view.metrics[0]).toMatchObject({
      label: 'Cases resolved',
      methodHref: '/en/methodology#counting-cases',
    });
  });

  it('saves the suppressed result to the snapshot, never the raw sheet', async () => {
    await loadImpact('mn');

    expect(updateGlobal).toHaveBeenCalledTimes(1);
    const snapshot = storedSnapshot();
    expect(snapshot.metrics).toHaveLength(3);
    // The suppressed metric is stored suppressed: the figure 4 never lands in
    // the database, so it cannot leak through the snapshot either.
    expect(snapshot.metrics[2]).toMatchObject({
      value: null,
      suppressed: true,
      nCases: null,
    });
    expect(JSON.stringify(snapshot)).not.toContain('"n_cases"');
  });

  it('skips the write when the figures have not changed', async () => {
    await loadImpact('mn');
    const snapshot = storedSnapshot();
    vi.clearAllMocks();

    findGlobal.mockResolvedValue({ data: snapshot });
    fetchSheetValues.mockResolvedValue(sheetValues);

    const view = await loadImpact('mn');
    expect(updateGlobal).not.toHaveBeenCalled();
    expect(view.stale).toBe(false);
    expect(view.fetchedAt).toBe(snapshot.fetchedAt);
  });

  it('writes again once a figure changes', async () => {
    await loadImpact('mn');
    const snapshot = storedSnapshot();
    vi.clearAllMocks();

    const moved = structuredClone(sheetValues);
    (moved.totals[1] as unknown[])[3] = 43;
    (moved.totals[1] as unknown[])[4] = 43;

    findGlobal.mockResolvedValue({ data: snapshot });
    fetchSheetValues.mockResolvedValue(moved);

    await loadImpact('mn');
    expect(updateGlobal).toHaveBeenCalledTimes(1);
  });

  it('still serves the figures when the snapshot cannot be written', async () => {
    updateGlobal.mockRejectedValue(new Error('database down'));

    const view = await loadImpact('mn');
    expect(view.stale).toBe(false);
    expect(view.metrics).toHaveLength(3);
  });
});

describe('a failed fetch falls back to the last snapshot', () => {
  it('serves the snapshot and marks it stale', async () => {
    await loadImpact('mn');
    const snapshot = storedSnapshot();
    vi.clearAllMocks();

    findGlobal.mockResolvedValue({ data: snapshot });
    fetchSheetValues.mockRejectedValue(new Error('network down'));

    const view = await loadImpact('mn');
    expect(view.stale).toBe(true);
    expect(view.metrics).toHaveLength(3);
    expect(view.fetchedAt).toBe(snapshot.fetchedAt);
    expect(updateGlobal).not.toHaveBeenCalled();
  });

  it('treats a schema break as a failure and keeps the old figures', async () => {
    await loadImpact('mn');
    const snapshot = storedSnapshot();
    vi.clearAllMocks();

    findGlobal.mockResolvedValue({ data: snapshot });
    fetchSheetValues.mockResolvedValue({
      totals: totalsWithBadDate,
      monthly: [MONTHLY_HEADER],
    });

    const view = await loadImpact('mn');
    expect(view.stale).toBe(true);
    expect(view.metrics).toHaveLength(3);
    expect(updateGlobal).not.toHaveBeenCalled();
  });

  it('returns nothing rather than inventing figures when no snapshot exists', async () => {
    fetchSheetValues.mockRejectedValue(new Error('network down'));
    findGlobal.mockResolvedValue({ data: null });

    const view = await loadImpact('mn');
    expect(view).toEqual({ metrics: [], monthly: [], fetchedAt: null, stale: true });
  });
});

describe('logging', () => {
  it('logs the error type and the time, never a row or a value', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    fetchSheetValues.mockResolvedValue({
      totals: [
        [
          'metric_id',
          'label_mn',
          'label_en',
          'value',
          'n_cases',
          'as_of',
          'method_anchor',
          'show_on_home',
        ],
        [
          'cases-resolved',
          'Шийдвэрлэсэн хэрэг',
          'Cases resolved',
          42,
          42,
          'NOT A DATE',
          'counting-cases',
          'TRUE',
        ],
      ],
      monthly: [MONTHLY_HEADER],
    });

    await loadImpact('mn');

    expect(spy).toHaveBeenCalledTimes(1);
    const line = String(spy.mock.calls[0]?.[0]);
    expect(line).toMatch(/^\[impact] schema failure at \d{4}-\d{2}-\d{2}T/);
    for (const leak of [
      'Шийдвэрлэсэн',
      'Cases resolved',
      '42',
      'cases-resolved',
      'NOT A DATE',
    ]) {
      expect(line).not.toContain(leak);
    }
    spy.mockRestore();
  });
});

describe('snapshotHash', () => {
  it('changes when a figure changes and holds when nothing does', () => {
    const base = {
      metrics: [
        {
          metricId: 'a',
          labelMn: 'А',
          labelEn: 'A',
          value: 10,
          suppressed: false,
          nCases: 10,
          asOf: '2026-09-30',
          methodAnchor: 'counting-a',
          showOnHome: true,
        },
      ],
      monthly: [],
    };

    expect(snapshotHash(base)).toBe(snapshotHash(structuredClone(base)));
    expect(
      snapshotHash({ ...base, metrics: [{ ...base.metrics[0]!, value: 11 }] }),
    ).not.toBe(snapshotHash(base));
  });
});

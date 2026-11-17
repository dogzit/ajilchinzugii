// @vitest-environment node
import { readFile } from 'node:fs/promises';
import { afterEach, describe, expect, it, vi } from 'vitest';

const findGlobal = vi.fn();
const updateGlobal = vi.fn();

vi.mock('../../src/payload.config', () => ({ default: {} }));
vi.mock('payload', () => ({ getPayload: async () => ({ findGlobal, updateGlobal }) }));

const { loadImpact } = await import('../../src/lib/impact/index');
const { sampleImpactEnabled } = await import('../../src/lib/impact/sample');

afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});

const withSample = () => {
  vi.stubEnv('IMPACT_SAMPLE', 'true');
  findGlobal.mockResolvedValue({ data: null });
  updateGlobal.mockResolvedValue({});
};

describe('the stand-in impact figures', () => {
  it('are off unless a deployment asks for them', () => {
    vi.stubEnv('IMPACT_SAMPLE', '');
    expect(sampleImpactEnabled()).toBe(false);
    vi.stubEnv('IMPACT_SAMPLE', 'false');
    expect(sampleImpactEnabled()).toBe(false);
  });

  it('go through the real pipeline, so the pages are exercised not bypassed', async () => {
    withSample();
    const view = await loadImpact('mn');

    expect(view.stale).toBe(false);
    expect(view.metrics.length).toBeGreaterThan(0);
    expect(view.monthly.length).toBeGreaterThan(0);
    // Localised, like real data.
    expect(view.metrics.map((m) => m.label)).toContain('Шийдвэрлэсэн хэрэг');
  });

  it('are suppressed below five cases, like any other figure', async () => {
    withSample();
    const view = await loadImpact('en');
    const small = view.metrics.find((m) => m.metricId === 'hazardous-work-ended');

    // Built from 3 cases. A number here means rule 2 has broken.
    expect(small).toBeDefined();
    expect(small?.suppressed).toBe(true);
    expect(small?.value).toBeNull();
  });

  it('are never written to the database', async () => {
    withSample();
    await loadImpact('mn');

    // The database is shared with the live site; persisting a stand-in
    // figure would surface it on a deployment that never asked for one.
    expect(updateGlobal).not.toHaveBeenCalled();
  });

  it('carry an as-of date and a methodology anchor, as a real figure must', async () => {
    withSample();
    const view = await loadImpact('en');
    const metric = view.metrics.find((m) => m.metricId === 'cases-resolved');

    expect(metric?.asOf).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(metric?.methodAnchor).toBeTruthy();
  });

  it('point at counting rules that exist on the methodology page', async () => {
    withSample();
    const view = await loadImpact('en');

    // Read from the seed source rather than imported: importing it pulls in
    // the whole Payload config, and the only thing under test here is
    // whether the two lists of anchors still agree.
    const seed = await readFile(
      new URL('../../src/payload/seed-org.ts', import.meta.url),
      'utf8',
    );
    const anchors = new Set(
      [...seed.matchAll(/anchorId: '([^']+)'/g)].map((match) => match[1]!),
    );
    expect(anchors.size).toBeGreaterThan(0);

    // "How is this counted?" is the link a skeptical reader is most likely
    // to follow. An anchor with no rule behind it scrolls nowhere.
    for (const metric of view.metrics) {
      expect(anchors).toContain(metric.methodAnchor);
    }
  });

  it('sum each monthly series to the figure on the card', async () => {
    withSample();
    const view = await loadImpact('en');

    const charted = new Set(view.monthly.map((point) => point.metricId));
    expect(charted.size).toBeGreaterThan(0);

    for (const metricId of charted) {
      const total = view.metrics.find((m) => m.metricId === metricId);
      const summed = view.monthly
        .filter((point) => point.metricId === metricId)
        .reduce((runningTotal, point) => runningTotal + (point.value ?? 0), 0);

      expect(summed).toBe(total?.value);
    }
  });
});

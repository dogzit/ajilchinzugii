import { cache } from 'react';
import { getPayload } from 'payload';
import config from '../../payload.config';
import type { Locale } from '../../i18n/routing';
import { fetchSheetValues } from './client';
import { parseSheet } from './schema';
import {
  suppressSmallCells,
  type ImpactMetric,
  type ImpactMonthlyPoint,
} from './suppress';

export { IMPACT_CACHE_TAG, IMPACT_REVALIDATE_SECONDS } from './client';
export { SMALL_CELL_THRESHOLD } from './suppress';
export type { ImpactMetric, ImpactMonthlyPoint } from './suppress';

/**
 * The impact pipeline: sheet → zod → suppression → page.
 *
 * Nothing downstream ever sees an unsuppressed figure, and nothing here logs a
 * cell. On any failure the last good snapshot is served with `stale: true`,
 * because a page that silently loses its figures is worse than one that says
 * how old they are.
 */

export const IMPACT_SNAPSHOT_VERSION = 1;

/** What is stored in the ImpactSnapshot global — both languages, suppressed. */
export type ImpactSnapshot = {
  version: number;
  fetchedAt: string;
  /** Lets a repeat fetch of unchanged data skip the database write. */
  hash: string;
  metrics: ImpactMetric[];
  monthly: ImpactMonthlyPoint[];
};

/** One figure, in the language being rendered. */
export type LocalizedMetric = {
  metricId: string;
  label: string;
  value: number | null;
  suppressed: boolean;
  nCases: number | null;
  asOf: string;
  methodAnchor: string;
  /** Where the figure's counting rule is written down. */
  methodHref: string;
  showOnHome: boolean;
};

export type ImpactView = {
  metrics: LocalizedMetric[];
  monthly: ImpactMonthlyPoint[];
  /** When this data was last fetched and found to differ. Null if never. */
  fetchedAt: string | null;
  /** True when the live sheet could not be read and this is the last snapshot. */
  stale: boolean;
};

type FailureKind = 'config' | 'fetch' | 'schema' | 'unknown';

function failureKind(error: unknown): FailureKind {
  const kind = (error as { kind?: string } | null)?.kind;
  if (kind === 'config' || kind === 'fetch') return kind;
  if ((error as { issues?: unknown[] } | null)?.issues) return 'schema';
  return 'unknown';
}

/**
 * Error type and timestamp only (CLAUDE.md rule 3). A schema message can quote
 * the cell that failed, so no message is ever written to the log.
 */
function logFailure(error: unknown): void {
  console.error(`[impact] ${failureKind(error)} failure at ${new Date().toISOString()}`);
}

/** Stable fingerprint of the suppressed data, used to avoid pointless writes. */
export function snapshotHash(data: {
  metrics: ImpactMetric[];
  monthly: ImpactMonthlyPoint[];
}): string {
  const shape = JSON.stringify([
    data.metrics.map((m) => [
      m.metricId,
      m.value,
      m.suppressed,
      m.nCases,
      m.asOf,
      m.methodAnchor,
      m.showOnHome,
      m.labelMn,
      m.labelEn,
    ]),
    data.monthly.map((p) => [p.metricId, p.month, p.value, p.suppressed, p.nCases]),
  ]);

  // djb2: a short, dependency-free fingerprint. Not a security hash.
  let hash = 5381;
  for (let i = 0; i < shape.length; i += 1) {
    hash = ((hash << 5) + hash + shape.charCodeAt(i)) | 0;
  }
  return (hash >>> 0).toString(36);
}

export function localizeMetrics(
  metrics: ImpactMetric[],
  locale: Locale,
): LocalizedMetric[] {
  return metrics.map((metric) => ({
    metricId: metric.metricId,
    label: locale === 'en' ? metric.labelEn : metric.labelMn,
    value: metric.value,
    suppressed: metric.suppressed,
    nCases: metric.nCases,
    asOf: metric.asOf,
    methodAnchor: metric.methodAnchor,
    methodHref: `/${locale}/methodology#${metric.methodAnchor}`,
    showOnHome: metric.showOnHome,
  }));
}

async function readSnapshot(): Promise<ImpactSnapshot | null> {
  try {
    const payload = await getPayload({ config });
    const global = await payload.findGlobal({
      slug: 'impact-snapshot',
      overrideAccess: true,
    });
    const stored = global?.data as ImpactSnapshot | null | undefined;
    return stored?.metrics ? stored : null;
  } catch (error) {
    logFailure(error);
    return null;
  }
}

async function writeSnapshot(snapshot: ImpactSnapshot): Promise<void> {
  const payload = await getPayload({ config });
  await payload.updateGlobal({
    slug: 'impact-snapshot',
    overrideAccess: true,
    data: { data: snapshot, fetchedAt: snapshot.fetchedAt },
  });
}

/**
 * The uncached implementation. Exported for tests; application code uses
 * `getImpact`, which adds per-request deduplication.
 */
export async function loadImpact(locale: Locale): Promise<ImpactView> {
  try {
    const values = await fetchSheetValues();
    const parsed = parseSheet(values);
    const suppressed = suppressSmallCells(parsed);
    const hash = snapshotHash(suppressed);

    const previous = await readSnapshot();

    // Only write when the figures actually changed: the fetch above is served
    // from Next's cache, so this function runs far more often than the sheet
    // changes, and `fetchedAt` should mark a change, not a cache read.
    if (previous?.hash !== hash) {
      const snapshot: ImpactSnapshot = {
        version: IMPACT_SNAPSHOT_VERSION,
        fetchedAt: new Date().toISOString(),
        hash,
        ...suppressed,
      };
      try {
        await writeSnapshot(snapshot);
      } catch (error) {
        // A storage failure must not take the figures off the page.
        logFailure(error);
      }
      return {
        metrics: localizeMetrics(snapshot.metrics, locale),
        monthly: snapshot.monthly,
        fetchedAt: snapshot.fetchedAt,
        stale: false,
      };
    }

    return {
      metrics: localizeMetrics(previous.metrics, locale),
      monthly: previous.monthly,
      fetchedAt: previous.fetchedAt,
      stale: false,
    };
  } catch (error) {
    logFailure(error);

    const snapshot = await readSnapshot();
    if (!snapshot) {
      // Nothing has ever been fetched: an empty, clearly stale result. The
      // page renders its "no figures yet" state rather than inventing any.
      return { metrics: [], monthly: [], fetchedAt: null, stale: true };
    }

    return {
      metrics: localizeMetrics(snapshot.metrics, locale),
      monthly: snapshot.monthly,
      fetchedAt: snapshot.fetchedAt,
      stale: true,
    };
  }
}

/** Deduplicated per request, so two components on a page share one fetch. */
export const getImpact = cache(loadImpact);

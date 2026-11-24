import type { Payload } from 'payload';
import type { Rating } from './engine';
import type { ContractFields } from './fields';

/**
 * The anonymous counters (spec, "Anonymous analytics (always kept)"): rule,
 * result, rule set version, month, age band, job category, employer kind,
 * and aimag only if the reader picked one. Nothing else, and no row is tied
 * to a rating: each rating adds one to a set of shared counts.
 *
 * ponytail: read-then-write, so two ratings at the same instant can lose a
 * count. Upgrade path: an atomic `count = count + 1` in SQL per adapter if
 * the numbers ever need to be exact.
 */
export async function recordStats(payload: Payload, rating: Rating, fields: ContractFields, aimag: string | null = null): Promise<void> {
  const month = rating.ratedOn.slice(0, 7);
  const base = {
    ruleSetVersion: rating.ruleSetVersion,
    month,
    ageBand: rating.ageBand,
    jobCategory: fields.job_category ?? 'unknown',
    employerKind: fields.via_labour_agency ? 'agency' : (fields.employer_kind ?? 'unknown'),
    aimag,
  };
  for (const result of rating.results) {
    const key = { ...base, ruleId: result.id, result: result.verdict };
    const where = Object.fromEntries(
      Object.entries(key).map(([k, v]) => [k, v === null ? { exists: false } : { equals: v }]),
    );
    const { docs } = await payload.find({ collection: 'rater-stats', where, limit: 1, depth: 0, overrideAccess: true });
    const row = docs[0];
    if (row) await payload.update({ collection: 'rater-stats', id: row.id, data: { count: row.count + 1 }, overrideAccess: true });
    else await payload.create({ collection: 'rater-stats', data: { ...key, count: 1 }, overrideAccess: true });
  }
}

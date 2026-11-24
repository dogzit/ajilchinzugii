import type { Verdict } from './verdict';

/**
 * The 1–100 score: a pure function of the engine's results, shared by the
 * contract rater and the CV rater (prompt §2, "The 1–100 score").
 *
 *   score = start − Σ weight(non-green item)   (fail weight, or the smaller unknown weight)
 *   then clamped into the band of the overall verdict
 *   then capped at `p1_cap` if any P1 trigger fired.
 *
 * The clamp is what makes the invariant hold whatever the weights are: a red
 * verdict can never score 40 or more, and all green is always 100.
 */

export type ScoreItem = {
  status: 'pass' | 'fail' | 'unknown';
  weight: { fail: number; unknown: number };
};

export type ScoreConfig = {
  start: number;
  bands: Record<Verdict, { min: number; max: number }>;
  p1_cap: number;
};

export function computeScore(items: ScoreItem[], verdict: Verdict, p1: boolean, config: ScoreConfig): number {
  const raw = items.reduce(
    (score, item) =>
      score - (item.status === 'fail' ? item.weight.fail : item.status === 'unknown' ? item.weight.unknown : 0),
    config.start,
  );
  const band = config.bands[verdict];
  const clamped = Math.min(band.max, Math.max(band.min, Math.round(raw)));
  return p1 ? Math.min(clamped, config.p1_cap) : clamped;
}

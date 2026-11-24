/**
 * The colour of a 1–100 score: red → amber → green, interpolated in OKLCH.
 *
 * The stops are the `--score-*` tokens in globals.css, so this returns a CSS
 * expression rather than a hex — components never carry a colour of their
 * own. Amber sits at 57, the middle of the yellow band (40–74), so every red
 * score (1–39) is a mix of red and amber only and can never look green.
 * tests/unit/score-color.test.ts reproduces the browser's interpolation and
 * holds every score to 3:1 against every surface in both themes.
 */
export const SCORE_AMBER_AT = 57;

const percent = (fraction: number) => `${(fraction * 100).toFixed(1)}%`;

export function clampScore(score: number): number {
  return Math.min(100, Math.max(1, Math.round(score)));
}

/** `[from, to, fraction]` — the two stops a score lies between, and how far. */
export function scoreStops(
  score: number,
): ['red' | 'amber', 'amber' | 'green', number] {
  const s = clampScore(score);
  if (s <= SCORE_AMBER_AT) return ['red', 'amber', (s - 1) / (SCORE_AMBER_AT - 1)];
  return ['amber', 'green', (s - SCORE_AMBER_AT) / (100 - SCORE_AMBER_AT)];
}

export function scoreColor(score: number): string {
  const [from, to, fraction] = scoreStops(score);
  return `color-mix(in oklch, var(--score-${to}) ${percent(fraction)}, var(--score-${from}))`;
}

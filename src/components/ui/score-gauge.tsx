import { VerdictBadge } from '@/components/ui/verdict-badge';
import type { Verdict } from '@/lib/rater/verdict';
import { clampScore, scoreColor } from '@/lib/score-color';

/**
 * The 1–100 score as a half-dial.
 *
 * The arc fills to the score in a colour interpolated from red through amber
 * to green; the number itself stays in ink (4.5:1), and the verdict word and
 * its icon sit under it, so colour is never the only signal. The drawing is
 * decorative — the number and the word are real text.
 */
export function ScoreGauge({
  score,
  verdict,
  verdictLabel,
  outOf,
}: {
  score: number;
  verdict: Verdict;
  verdictLabel: string;
  /** "100-аас" — read after the number. */
  outOf: string;
}) {
  const value = clampScore(score);
  const arc = 'M 20 100 A 80 80 0 0 1 180 100';

  return (
    <figure className="flex flex-col items-center" data-score={value}>
      <div className="relative w-full max-w-[17rem]">
        <svg viewBox="0 0 200 112" aria-hidden="true" focusable="false" className="w-full">
          <path
            d={arc}
            fill="none"
            stroke="var(--border)"
            strokeWidth="16"
            strokeLinecap="round"
          />
          <path
            d={arc}
            fill="none"
            stroke={scoreColor(value)}
            strokeWidth="16"
            strokeLinecap="round"
            pathLength={100}
            strokeDasharray={`${value} 100`}
          />
        </svg>
        <p className="absolute inset-x-0 bottom-0 text-center">
          <span className="num font-display text-ink block text-6xl leading-none font-semibold">
            {value}
          </span>
          <span className="text-ink-muted mt-1 block text-sm">{outOf}</span>
        </p>
      </div>
      <figcaption className="mt-4">
        <VerdictBadge verdict={verdict} label={verdictLabel} className="text-base" />
      </figcaption>
    </figure>
  );
}

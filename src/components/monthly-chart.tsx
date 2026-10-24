import { useTranslations } from 'next-intl';
import { formatMonth, formatNumber } from '@/lib/format';
import type { ImpactMonthlyPoint } from '@/lib/impact';
import type { Locale } from '@/i18n/routing';

/**
 * A month-by-month line, drawn on the server as plain SVG — no chart library,
 * no client JavaScript (CLAUDE.md: hand-built accessible SVG).
 *
 * Two things matter more than the drawing:
 *  - a suppressed month is a GAP in the line, never a zero. Drawing it at zero
 *    would publish a false figure and let the reader infer the withheld one;
 *  - the same numbers are available as a real table below, which is what a
 *    screen reader, a sceptical reader and a copy-paste all actually want.
 */

const WIDTH = 560;
const HEIGHT = 240;
const TOP = 16;
const RIGHT = 14;
const BOTTOM = 34;
const PLOT_H = HEIGHT - TOP - BOTTOM;

type Shown = ImpactMonthlyPoint & { value: number };

export function MonthlyChart({
  points,
  label,
  locale,
}: {
  points: ImpactMonthlyPoint[];
  label: string;
  locale: Locale;
}) {
  const t = useTranslations();
  const sorted = [...points].sort((a, b) => a.month.localeCompare(b.month));
  const shown = sorted.filter((p): p is Shown => !p.suppressed && p.value !== null);

  if (sorted.length === 0) return null;

  const max = Math.max(...shown.map((p) => p.value), 0);
  const scaleMax = max > 0 ? max : 1;
  const ticks = [0, scaleMax / 2, scaleMax];

  // A figure in millions needs a wider gutter than one in tens, or the axis
  // labels run off the left edge.
  const tickLabels = ticks.map((tick) => formatNumber(Math.round(tick), locale));
  const left = Math.min(
    120,
    Math.max(44, Math.max(...tickLabels.map((l) => l.length)) * 7.6 + 12),
  );
  const plotW = WIDTH - left - RIGHT;

  const x = (index: number) =>
    left + (sorted.length === 1 ? plotW / 2 : (index / (sorted.length - 1)) * plotW);
  const y = (value: number) => TOP + PLOT_H - (value / scaleMax) * PLOT_H;

  // Contiguous runs of visible months. Each run is its own line, so the gaps
  // where a month was withheld stay empty.
  const runs: { index: number; point: Shown }[][] = [];
  sorted.forEach((point, index) => {
    if (point.suppressed || point.value === null) {
      if (runs.at(-1)?.length) runs.push([]);
      return;
    }
    if (runs.length === 0) runs.push([]);
    runs.at(-1)?.push({ index, point: point as Shown });
  });

  const labelled = labelledMonths(sorted.length);
  const suppressedCount = sorted.length - shown.length;

  const summary = t('impact.chartSummary', {
    label,
    from: formatMonth(sorted[0]!.month, locale),
    to: formatMonth(sorted.at(-1)!.month, locale),
    max: max > 0 ? formatNumber(max, locale) : '—',
    suppressedCount,
  });

  return (
    <figure className="mt-6 flex flex-col gap-3">
      <figcaption className="text-ink text-sm">{label}</figcaption>

      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        width="100%"
        height="auto"
        role="img"
        aria-label={summary}
        className="max-w-[560px]"
      >
        {ticks.map((tick, index) => (
          <g key={tick}>
            <line
              x1={left}
              x2={WIDTH - RIGHT}
              y1={y(tick)}
              y2={y(tick)}
              stroke="var(--border)"
              strokeWidth="1"
            />
            <text
              x={left - 8}
              y={y(tick) + 4}
              textAnchor="end"
              fontSize="13"
              fill="var(--ink-muted)"
              style={{ fontVariantNumeric: 'tabular-nums' }}
            >
              {tickLabels[index]}
            </text>
          </g>
        ))}

        <line
          x1={left}
          x2={left}
          y1={TOP}
          y2={TOP + PLOT_H}
          stroke="var(--border-strong)"
          strokeWidth="1"
        />

        {runs
          .filter((run) => run.length > 1)
          .map((run) => (
            <polyline
              key={run[0]!.index}
              points={run
                .map(({ index, point }) => `${x(index)},${y(point.value)}`)
                .join(' ')}
              fill="none"
              stroke="var(--accent-mark)"
              strokeWidth="2"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          ))}

        {shown.map((point) => {
          const index = sorted.indexOf(point);
          return (
            <circle
              key={point.month}
              cx={x(index)}
              cy={y(point.value)}
              r="3.5"
              fill="var(--accent-mark)"
            />
          );
        })}

        {sorted.map((point, index) =>
          labelled.has(index) ? (
            <text
              key={point.month}
              x={x(index)}
              y={HEIGHT - 10}
              textAnchor={
                index === 0 ? 'start' : index === sorted.length - 1 ? 'end' : 'middle'
              }
              fontSize="13"
              fill="var(--ink-muted)"
              style={{ fontVariantNumeric: 'tabular-nums' }}
            >
              {formatMonth(point.month, locale, true)}
            </text>
          ) : null,
        )}
      </svg>

      {suppressedCount > 0 ? (
        <p className="text-ink-muted max-w-[65ch] text-sm">
          {t('impact.monthlyGapNote')}
        </p>
      ) : null}

      <details className="border-border bg-surface-muted max-w-[65ch] rounded-sm border">
        <summary className="text-ink-soft cursor-pointer list-none px-4 py-2 text-sm [&::-webkit-details-marker]:hidden">
          <span aria-hidden="true" className="text-accent-mark me-2">
            ▸
          </span>
          {t('impact.showData')}
        </summary>
        <div className="overflow-x-auto px-4 pt-1 pb-4">
          <table className="num w-full min-w-[18rem] text-sm">
            <caption className="sr-only">{summary}</caption>
            <thead>
              <tr className="text-ink-muted text-start">
                <th scope="col" className="py-1.5 pe-4 text-start font-normal">
                  {t('impact.month')}
                </th>
                <th scope="col" className="py-1.5 text-end font-normal">
                  {t('impact.value')}
                </th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((point) => (
                <tr key={point.month} className="border-border border-t">
                  <td className="text-ink-soft py-1.5 pe-4">
                    {formatMonth(point.month, locale)}
                  </td>
                  <td className="text-ink py-1.5 text-end">
                    {point.suppressed || point.value === null
                      ? t('impact.suppressed')
                      : formatNumber(point.value, locale)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </figure>
  );
}

/** First, last and a few in between — a crowded axis reads as noise. */
function labelledMonths(count: number): Set<number> {
  if (count <= 4) return new Set(Array.from({ length: count }, (_, i) => i));
  const step = Math.ceil(count / 4);
  const indexes = new Set<number>([0, count - 1]);
  for (let i = step; i < count - 1; i += step) indexes.add(i);
  return indexes;
}

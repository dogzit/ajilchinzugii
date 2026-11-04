import { useTranslations } from 'next-intl';
import { formatPercent } from '@/lib/format';
import type { Locale } from '@/i18n/routing';

/**
 * Two groups compared measure by measure, drawn on the server as plain SVG —
 * same rules as the monthly chart: no chart library, no client JavaScript
 * (CLAUDE.md: hand-built accessible SVG), and the same numbers available as a
 * real table underneath (rule 7 — every chart has a data table alternative).
 *
 * This chart carries a *published paper's* own figures, not the
 * organisation's impact figures. Those come only from the sheet pipeline and
 * are suppressed below five cases (rules 1 and 2); these are already-public
 * survey estimates, and each one names the passage it is read from, so the
 * two can never be mistaken for one another.
 *
 * Bars are horizontal because the measures are sentences, not dates: a label
 * like "Punished or abused at work" needs a line of its own, and a vertical
 * axis would turn every one of them on its side.
 */

const WIDTH = 620;
const ROW_H = 46;
const BAR_H = 13;
const TOP = 10;
const BOTTOM = 26;
const RIGHT = 54;
const LABEL_W = 232;

export type ComparisonRow = {
  label: string;
  groupA: number;
  groupB: number;
};

export function ComparisonChart({
  rows,
  title,
  groupALabel,
  groupBLabel,
  note,
  locale,
  id,
}: {
  rows: ComparisonRow[];
  title?: string | null;
  groupALabel: string;
  groupBLabel: string;
  note?: string | null;
  locale: Locale;
  id: string;
}) {
  const t = useTranslations();
  if (rows.length === 0) return null;

  // Sorted by the size of the gap, the way the paper's own figure is: the
  // reader should meet the widest difference first, not the first row typed.
  const sorted = [...rows].sort(
    (a, b) => Math.abs(b.groupA - b.groupB) - Math.abs(a.groupA - a.groupB),
  );

  const max = Math.max(...sorted.flatMap((row) => [row.groupA, row.groupB]), 0);
  // Round the axis up to the next ten so the longest bar never touches the
  // edge and the ticks land on readable numbers.
  const scaleMax = max > 0 ? Math.ceil(max / 10) * 10 : 100;
  const plotW = WIDTH - LABEL_W - RIGHT;
  const height = TOP + sorted.length * ROW_H + BOTTOM;

  const widest = sorted[0]!;
  const summary = t('research.chartSummary', {
    groupA: groupALabel,
    groupB: groupBLabel,
    count: sorted.length,
    measure: widest.label,
    valueA: formatPercent(widest.groupA, locale),
    valueB: formatPercent(widest.groupB, locale),
  });

  const x = (value: number) => (value / scaleMax) * plotW;
  const ticks = [0, scaleMax / 2, scaleMax];

  return (
    <figure className="mt-6 flex flex-col gap-4">
      {title ? <figcaption className="text-ink text-sm">{title}</figcaption> : null}

      {/* The key, as text rather than as swatches a screen reader skips. */}
      <ul className="text-ink-muted flex flex-wrap gap-x-6 gap-y-2 text-xs">
        <li className="flex items-center gap-2">
          <span
            aria-hidden="true"
            className="bg-accent-mark h-2.5 w-5 shrink-0 rounded-full"
          />
          {groupALabel}
        </li>
        <li className="flex items-center gap-2">
          <span
            aria-hidden="true"
            className="border-border-strong bg-surface-tint h-2.5 w-5 shrink-0 rounded-full border"
          />
          {groupBLabel}
        </li>
      </ul>

      <svg
        viewBox={`0 0 ${WIDTH} ${height}`}
        role="img"
        aria-label={summary}
        className="h-auto w-full"
      >
        {ticks.map((tick) => (
          <g key={tick}>
            <line
              x1={LABEL_W + x(tick)}
              x2={LABEL_W + x(tick)}
              y1={TOP}
              y2={TOP + sorted.length * ROW_H}
              stroke="var(--border)"
              strokeWidth="1"
            />
            <text
              x={LABEL_W + x(tick)}
              y={height - 8}
              textAnchor={tick === 0 ? 'start' : tick === scaleMax ? 'end' : 'middle'}
              fontSize="12"
              fill="var(--ink-muted)"
              style={{ fontVariantNumeric: 'tabular-nums' }}
            >
              {formatPercent(tick, locale)}
            </text>
          </g>
        ))}

        {sorted.map((row, index) => {
          const top = TOP + index * ROW_H;
          const gap = 3;
          const aY = top + ROW_H / 2 - BAR_H - gap / 2;
          const bY = top + ROW_H / 2 + gap / 2;

          return (
            <g key={row.label}>
              <text
                x={LABEL_W - 12}
                y={top + ROW_H / 2 + 4}
                textAnchor="end"
                fontSize="12.5"
                fill="var(--ink-soft)"
              >
                {row.label}
              </text>

              <rect
                x={LABEL_W}
                y={aY}
                width={Math.max(x(row.groupA), 1)}
                height={BAR_H}
                rx="2"
                fill="var(--accent-mark)"
              />
              <text
                x={LABEL_W + Math.max(x(row.groupA), 1) + 6}
                y={aY + BAR_H - 2}
                fontSize="11.5"
                fill="var(--ink-muted)"
                style={{ fontVariantNumeric: 'tabular-nums' }}
              >
                {formatPercent(row.groupA, locale)}
              </text>

              <rect
                x={LABEL_W}
                y={bY}
                width={Math.max(x(row.groupB), 1)}
                height={BAR_H}
                rx="2"
                fill="var(--surface-tint)"
                stroke="var(--border-strong)"
                strokeWidth="1"
              />
              <text
                x={LABEL_W + Math.max(x(row.groupB), 1) + 6}
                y={bY + BAR_H - 2}
                fontSize="11.5"
                fill="var(--ink-muted)"
                style={{ fontVariantNumeric: 'tabular-nums' }}
              >
                {formatPercent(row.groupB, locale)}
              </text>
            </g>
          );
        })}

        <line
          x1={LABEL_W}
          x2={LABEL_W}
          y1={TOP}
          y2={TOP + sorted.length * ROW_H}
          stroke="var(--border-strong)"
          strokeWidth="1"
        />
      </svg>

      <details className="border-border bg-surface-tint rounded-2xl border">
        <summary className="text-ink-soft cursor-pointer list-none px-4 py-2 text-sm [&::-webkit-details-marker]:hidden">
          <span aria-hidden="true" className="text-accent-mark me-2">
            ▸
          </span>
          {t('impact.showData')}
        </summary>
        <div className="overflow-x-auto px-4 pt-1 pb-4">
          <table className="num w-full min-w-[22rem] text-sm" id={`${id}-table`}>
            <caption className="sr-only">{summary}</caption>
            <thead>
              <tr className="text-ink-muted">
                <th scope="col" className="py-1.5 pe-4 text-start font-normal">
                  {t('research.measure')}
                </th>
                <th scope="col" className="py-1.5 pe-4 text-end font-normal">
                  {groupALabel}
                </th>
                <th scope="col" className="py-1.5 text-end font-normal">
                  {groupBLabel}
                </th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((row) => (
                <tr key={row.label} className="border-border border-t">
                  <th
                    scope="row"
                    className="text-ink-soft py-1.5 pe-4 text-start font-normal"
                  >
                    {row.label}
                  </th>
                  <td className="text-ink py-1.5 pe-4 text-end">
                    {formatPercent(row.groupA, locale)}
                  </td>
                  <td className="text-ink py-1.5 text-end">
                    {formatPercent(row.groupB, locale)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>

      {note ? <p className="text-ink-muted max-w-[70ch] text-xs">{note}</p> : null}
    </figure>
  );
}

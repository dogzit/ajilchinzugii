import Link from 'next/link';
import { Icon } from '@/components/ui/icon';
import { localeHref } from '@/lib/locale-href';
import { formatCompact, formatDate, formatNumber } from '@/lib/format';
import type { LocalizedMetric } from '@/lib/impact';
import type { Locale } from '@/i18n/routing';

/**
 * One headline figure.
 *
 * A suppressed figure is not hidden — it keeps its label, its date and its
 * link to the counting rule, and says plainly that fewer than five cases sit
 * behind it. That is the honest rendering of a withheld number, and it is
 * why the figure and the label share one card rather than two layouts.
 *
 * Long figures are shortened for the eye ("48.6 сая") while the exact value
 * stays the card's accessible name, so nothing is lost to a screen reader.
 */
export function StatCard({
  metric,
  locale,
  labels,
  compact = true,
}: {
  metric: LocalizedMetric;
  locale: Locale;
  labels: {
    suppressed: string;
    asOf: (date: string) => string;
    basedOnCases: (count: number) => string;
    howCounted: string;
  };
  compact?: boolean;
}) {
  const asOf = formatDate(metric.asOf, locale);
  const exact = metric.value === null ? null : formatNumber(metric.value, locale);
  const shown =
    metric.value === null
      ? '—'
      : compact
        ? formatCompact(metric.value, locale)
        : (exact as string);

  return (
    <article className="border-border bg-surface flex flex-col rounded-3xl border p-6">
      <h3 className="text-ink-muted font-sans text-sm leading-snug font-medium">
        {metric.label}
      </h3>

      {metric.suppressed ? (
        <p className="text-ink-soft mt-4 font-sans text-xl">{labels.suppressed}</p>
      ) : (
        <p
          className="num font-display text-ink mt-4 text-4xl leading-none sm:text-5xl"
          // The eye gets "48.6 сая"; anyone listening gets every digit.
          aria-label={exact ?? undefined}
        >
          {shown}
        </p>
      )}

      <dl className="num border-border text-ink-muted mt-5 flex flex-wrap gap-x-4 gap-y-1 border-t pt-4 text-xs">
        {asOf ? (
          <div className="flex gap-1.5">
            <dt className="sr-only">{labels.howCounted}</dt>
            <dd>{labels.asOf(asOf)}</dd>
          </div>
        ) : null}
        {metric.nCases !== null ? (
          <div className="flex gap-1.5">
            <dt className="sr-only">{labels.howCounted}</dt>
            <dd>{labels.basedOnCases(metric.nCases)}</dd>
          </div>
        ) : null}
      </dl>

      <Link
        href={`${localeHref(locale, '/methodology')}#${metric.methodAnchor}`}
        className="text-accent-text hover:text-ink mt-4 inline-flex items-center gap-1.5 self-start text-sm font-medium"
      >
        {labels.howCounted}
        <Icon name="arrow-right" className="h-4 w-4" />
      </Link>
    </article>
  );
}

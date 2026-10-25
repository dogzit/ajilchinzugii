import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { Hexagon } from '@/components/hexagon';
import { localeHref } from '@/lib/locale-href';
import { formatDate, formatNumber } from '@/lib/format';
import type { LocalizedMetric } from '@/lib/impact';
import type { Locale } from '@/i18n/routing';

/**
 * One headline figure.
 *
 * A suppressed figure is not hidden — it keeps its label, its date and its
 * link to the counting rule, and says plainly that fewer than five cases sit
 * behind it. That is the honest rendering of a withheld number, and it is why
 * the figure and the label share one tile rather than two layouts.
 */
export function MetricTile({
  metric,
  locale,
  size = 'default',
}: {
  metric: LocalizedMetric;
  locale: Locale;
  size?: 'default' | 'large';
}) {
  const t = useTranslations();
  const asOf = formatDate(metric.asOf, locale);

  return (
    <article className="border-border flex flex-col gap-2 border-t pt-4">
      <h3 className="text-ink-muted flex items-start gap-2 font-sans text-sm font-normal">
        <Hexagon className="text-accent-mark mt-1 shrink-0" />
        <span>{metric.label}</span>
      </h3>

      {metric.suppressed ? (
        <p
          className={`text-ink-soft font-sans ${
            size === 'large' ? 'text-2xl sm:text-3xl' : 'text-xl'
          }`}
        >
          {t('impact.suppressed')}
        </p>
      ) : (
        <p
          className={`num text-ink leading-none tracking-tight ${
            size === 'large' ? 'text-4xl sm:text-5xl' : 'text-3xl'
          }`}
        >
          {metric.value === null ? '—' : formatNumber(metric.value, locale)}
        </p>
      )}

      <dl className="num text-ink-muted mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs">
        {asOf ? (
          <div className="flex gap-1.5">
            <dt className="sr-only">{t('common.lastUpdated')}</dt>
            <dd>{t('common.asOf', { date: asOf })}</dd>
          </div>
        ) : null}
        {metric.nCases !== null ? (
          <div className="flex gap-1.5">
            <dt className="sr-only">{t('impact.metric')}</dt>
            <dd>{t('impact.basedOnCases', { count: metric.nCases })}</dd>
          </div>
        ) : null}
      </dl>

      <Link
        href={`${localeHref(locale, '/methodology')}#${metric.methodAnchor}`}
        className="text-accent decoration-accent-mark hover:text-ink mt-1 self-start text-sm underline underline-offset-4"
      >
        {t('impact.howCounted')}
      </Link>
    </article>
  );
}

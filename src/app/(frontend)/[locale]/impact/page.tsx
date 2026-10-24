import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { MetricTile } from '@/components/metric-tile';
import { MonthlyChart } from '@/components/monthly-chart';
import { PageHeader } from '@/components/page-header';
import { StaleNotice } from '@/components/stale-notice';
import type { Locale } from '@/i18n/routing';
import { formatDateTime } from '@/lib/format';
import { getImpact } from '@/lib/impact';
import { pageMetadata } from '@/lib/metadata';

type Props = { params: Promise<{ locale: Locale }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return pageMetadata(locale, 'impact', '/impact');
}

export default async function ImpactPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const [t, impact] = await Promise.all([getTranslations(), getImpact(locale)]);
  const updated = formatDateTime(impact.fetchedAt, locale);

  // A metric gets a chart only if the sheet carries months for it.
  const monthsFor = (metricId: string) =>
    impact.monthly.filter((point) => point.metricId === metricId);

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
      <PageHeader title={t('pages.impact.title')} lead={t('pages.impact.lead')} />

      <div className="mt-6 flex flex-col gap-4">
        {impact.stale ? <StaleNotice /> : null}
        {updated ? (
          <p className="num text-ink-muted text-xs">
            {t('common.lastUpdated')}: {updated}
          </p>
        ) : null}
      </div>

      {impact.metrics.length === 0 ? (
        <p className="text-ink-muted mt-10 max-w-[65ch]">{t('impact.noFigures')}</p>
      ) : (
        <>
          <section aria-labelledby="figures" className="mt-10">
            <h2 id="figures" className="sr-only">
              {t('home.metricsHeading')}
            </h2>
            <div className="grid gap-x-8 gap-y-10 sm:grid-cols-2">
              {impact.metrics.map((metric) => (
                <MetricTile key={metric.metricId} metric={metric} locale={locale} />
              ))}
            </div>
            <p className="text-ink-muted mt-8 max-w-[65ch] text-sm">
              {t('impact.suppressedExplained')}
            </p>
          </section>

          {impact.monthly.length > 0 ? (
            <section
              aria-labelledby="monthly"
              className="border-border mt-16 border-t pt-10"
            >
              <h2 id="monthly" className="text-xl">
                {t('impact.monthlyTitle')}
              </h2>
              <div className="mt-4 flex flex-col gap-14">
                {impact.metrics
                  .filter((metric) => monthsFor(metric.metricId).length > 0)
                  .map((metric) => (
                    <MonthlyChart
                      key={metric.metricId}
                      points={monthsFor(metric.metricId)}
                      label={metric.label}
                      locale={locale}
                    />
                  ))}
              </div>
            </section>
          ) : null}
        </>
      )}
    </div>
  );
}

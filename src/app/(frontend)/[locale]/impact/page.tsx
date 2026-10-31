import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { StatCard } from '@/components/ui/stat-card';
import { MonthlyChart } from '@/components/monthly-chart';
import { PageHeader } from '@/components/page-header';
import { StaleNotice } from '@/components/stale-notice';
import type { Locale } from '@/i18n/routing';
import { formatDateTime } from '@/lib/format';
import { getImpact } from '@/lib/impact';
import { JsonLd } from '@/components/json-ld';
import { getMethodology } from '@/lib/cms';
import { breadcrumbJsonLd, datasetJsonLd } from '@/lib/seo/jsonld';
import { buildPageMetadata } from '@/lib/seo/metadata';

type Props = { params: Promise<{ locale: Locale }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale });

  return buildPageMetadata({
    locale,
    path: '/impact',
    title: t('pages.impact.title'),
    description: t('pages.impact.lead'),
    kind: 'figures',
  });
}

export default async function ImpactPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const [t, impact, methodology] = await Promise.all([
    getTranslations(),
    getImpact(locale),
    getMethodology(locale),
  ]);

  const statLabels = {
    suppressed: t('impact.suppressed'),
    asOf: (date: string) => t('common.asOf', { date }),
    basedOnCases: (count: number) => t('impact.basedOnCases', { count }),
    howCounted: t('impact.howCounted'),
  };
  const updated = formatDateTime(impact.fetchedAt, locale);

  // A metric gets a chart only if the sheet carries months for it.
  const monthsFor = (metricId: string) =>
    impact.monthly.filter((point) => point.metricId === metricId);

  return (
    <div className="shell max-w-[62rem] py-14 md:py-20">
      <JsonLd
        data={[
          datasetJsonLd({
            locale,
            name: `${t('site.name')} — ${t('pages.impact.title')}`,
            description: t('pages.impact.lead'),
            metrics: impact.metrics,
            monthly: impact.monthly,
            fetchedAt: impact.fetchedAt,
            methodology,
          }),
          breadcrumbJsonLd(
            [
              { name: t('nav.home'), path: '/' },
              { name: t('pages.impact.title'), path: '/impact' },
            ],
            locale,
          ),
        ]}
      />
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
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {impact.metrics.map((metric) => (
                <StatCard
                  key={metric.metricId}
                  metric={metric}
                  locale={locale}
                  // The impact page is where the exact figure belongs; only
                  // the home page shortens.
                  compact={false}
                  labels={statLabels}
                />
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

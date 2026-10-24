import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { CardLink } from '@/components/card-link';
import { MetricTile } from '@/components/metric-tile';
import { StaleNotice } from '@/components/stale-notice';
import type { Locale } from '@/i18n/routing';
import { getSite } from '@/lib/cms';
import { filledIn } from '@/lib/placeholder';
import { formatDateTime } from '@/lib/format';
import { getImpact } from '@/lib/impact';
import { buildPageMetadata } from '@/lib/seo/metadata';

type Props = { params: Promise<{ locale: Locale }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const [t, site] = await Promise.all([getTranslations({ locale }), getSite(locale)]);

  return buildPageMetadata({
    locale,
    path: '/',
    title: t('pages.home.title'),
    // Until the mission line is written, the catalogue's own description is a
    // better answer than repeating the site's name.
    description: filledIn(site.missionLine) ?? t('site.description'),
    seo: site.seo,
  });
}

export default async function HomePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const [t, site, impact] = await Promise.all([
    getTranslations(),
    getSite(locale),
    getImpact(locale),
  ]);

  // Four at most: a front page that leads with everything leads with nothing.
  const headline = impact.metrics.filter((metric) => metric.showOnHome).slice(0, 4);
  const updated = formatDateTime(impact.fetchedAt, locale);

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-16">
      <section>
        <h1 className="sr-only">{t('site.name')}</h1>
        <p className="font-display text-ink max-w-[28ch] text-2xl leading-tight sm:text-4xl">
          {site.missionLine}
        </p>
      </section>

      <section aria-labelledby="figures" className="mt-16">
        <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
          <h2 id="figures" className="text-xl">
            {t('home.metricsHeading')}
          </h2>
          {updated ? (
            <p className="num text-ink-muted text-xs">
              {t('common.lastUpdated')}: {updated}
            </p>
          ) : null}
        </div>

        {impact.stale ? (
          <div className="mt-4">
            <StaleNotice />
          </div>
        ) : null}

        {headline.length > 0 ? (
          <div className="mt-6 grid gap-x-8 gap-y-10 sm:grid-cols-2">
            {headline.map((metric) => (
              <MetricTile
                key={metric.metricId}
                metric={metric}
                locale={locale}
                size="large"
              />
            ))}
          </div>
        ) : (
          <p className="text-ink-muted mt-4 max-w-[65ch]">{t('impact.noFigures')}</p>
        )}

        <p className="mt-8">
          <a
            href={`/${locale}/impact`}
            className="text-accent decoration-accent-mark hover:text-ink text-sm underline underline-offset-4"
          >
            {t('home.allFigures')}
          </a>
        </p>
      </section>

      <section aria-labelledby="explore" className="mt-20">
        <h2 id="explore" className="text-xl">
          {t('home.exploreHeading')}
        </h2>
        <div className="mt-6 grid gap-x-8 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
          {(['methodology', 'research', 'policy', 'about'] as const).map((key) => (
            <CardLink
              key={key}
              href={`/${key}`}
              title={t(`pages.${key}.title`)}
              description={t(`pages.${key}.lead`)}
            />
          ))}
        </div>
      </section>
    </div>
  );
}

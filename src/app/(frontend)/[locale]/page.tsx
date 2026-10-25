import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Collaborate } from '@/components/home/collaborate';
import { Hero } from '@/components/home/hero';
import { PartnersMarquee } from '@/components/home/partners-marquee';
import { Pillars } from '@/components/home/pillars';
import { WhoWeAre } from '@/components/home/who-we-are';
import { MetricTile } from '@/components/metric-tile';
import { StaleNotice } from '@/components/stale-notice';
import type { Locale } from '@/i18n/routing';
import { getPartners, getSite } from '@/lib/cms';
import { localeHref } from '@/lib/locale-href';
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

  const [t, site, impact, partners] = await Promise.all([
    getTranslations(),
    getSite(locale),
    getImpact(locale),
    getPartners(locale),
  ]);

  // Four at most: a front page that leads with everything leads with nothing.
  const headline = impact.metrics.filter((metric) => metric.showOnHome).slice(0, 4);
  const updated = formatDateTime(impact.fetchedAt, locale);

  return (
    <>
      <Hero headline={site.missionLine} />

      <WhoWeAre eyebrow={t('home.whoWeAreEyebrow')} body={t('home.whoWeAreBody')} />

      <Pillars locale={locale} />

      <section aria-labelledby="figures" className="border-border border-b">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
          <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
            <h2 id="figures" className="font-display text-ink text-2xl sm:text-3xl">
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
            <div className="mt-8 grid gap-x-8 gap-y-10 sm:grid-cols-2">
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
              href={localeHref(locale, '/impact')}
              className="text-accent decoration-accent-mark hover:text-ink text-sm underline underline-offset-4"
            >
              {t('home.allFigures')}
            </a>
          </p>
        </div>
      </section>

      <Collaborate
        locale={locale}
        heading={t('home.collaborateHeading')}
        body={t('home.collaborateBody')}
        cta={t('home.collaborateCta')}
      />

      <PartnersMarquee
        partners={partners}
        locale={locale}
        heading={t('home.partnersHeading')}
        lead={t('home.partnersLead')}
        newTabLabel={t('common.openInNewTab')}
      />
    </>
  );
}

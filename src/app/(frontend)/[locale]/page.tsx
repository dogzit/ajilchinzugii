import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { CtaBand } from '@/components/home/cta-band';
import { Hero } from '@/components/home/hero';
import { PartnersMarquee } from '@/components/home/partners-marquee';
import { Evidence } from '@/components/home/evidence';
import { TrustStrip } from '@/components/home/trust-strip';
import { WhatWeDo } from '@/components/home/what-we-do';
import { SectionHeader } from '@/components/ui/section-header';
import { StatCard } from '@/components/ui/stat-card';
import { ButtonLink } from '@/components/ui/button';
import { isDemoContent } from '@/components/demo-banner';
import type { Locale } from '@/i18n/routing';
import { getPapers, getPartners, getSite } from '@/lib/cms';
import { pillars } from '@/lib/home-content';
import { localeHref } from '@/lib/locale-href';
import { publishable } from '@/lib/placeholder';
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
    // "Ажилчин Зөгий — Хөдөлмөр эрхэлж байгаа хүүхэд…": the name alone says
    // nothing to someone reading a list of search results.
    title: `${t('site.name')} — ${t('site.tagline')}`,
    // Until the mission line is written, the catalogue's own description is a
    // better answer than repeating the site's name.
    description: publishable(site.missionLine) ?? t('pages.home.description'),
    seo: site.seo,
  });
}

export default async function HomePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const [t, site, impact, partners, papers] = await Promise.all([
    getTranslations(),
    getSite(locale),
    getImpact(locale),
    getPartners(locale),
    getPapers(locale),
  ]);

  // Four at most: a front page that leads with everything leads with nothing.
  const headline = impact.metrics.filter((metric) => metric.showOnHome).slice(0, 4);
  // The hero's floating card shows the first headline figure, from this same
  // fetch — never a second, quietly different source.
  const featured = headline[0] ?? null;
  const updated = formatDateTime(impact.fetchedAt, locale);

  // The hero picture is optional on purpose: with nothing set the hero draws
  // its own mark rather than reaching for a stock photograph. Alt text is a
  // group of two required strings, not a localized field, so that a missing
  // translation cannot slip through (rule 7).
  const heroMedia = typeof site.heroImage === 'object' ? site.heroImage : null;
  const heroImage = heroMedia
    ? { url: heroMedia.url, alt: heroMedia.alt?.[locale] ?? '' }
    : null;

  // The front page shows the newest paper's own headline findings. They are
  // published survey estimates with a passage named under each one, never the
  // organisation's case-log figures — those come only from the sheet, in the
  // band above, and are suppressed below five cases.
  const evidencePaper = papers.find((paper) => (paper.findings ?? []).length > 0) ?? null;
  const evidence = (evidencePaper?.findings ?? [])
    .filter((finding) => finding.value && finding.label && finding.source)
    .slice(0, 3)
    .map((finding) => ({
      value: finding.value,
      label: finding.label,
      source: finding.source,
    }));

  const statLabels = {
    suppressed: t('impact.suppressed'),
    asOf: (date: string) => t('common.asOf', { date }),
    basedOnCases: (count: number) => t('impact.basedOnCases', { count }),
    howCounted: t('impact.howCounted'),
    asOfTerm: t('impact.asOfTerm'),
    casesTerm: t('impact.casesTerm'),
  };

  return (
    <>
      <Hero
        locale={locale}
        eyebrow={t('home.heroEyebrow')}
        headline={t('home.heroHeadline')}
        mission={site.missionLine}
        primaryCta={t('home.heroPrimaryCta')}
        secondaryCta={t('home.heroSecondaryCta')}
        trustLine={t('home.heroTrust')}
        sampleLabel={isDemoContent(site.missionLine) ? t('demo.tag') : null}
        featured={featured}
        featuredLabels={{ suppressed: statLabels.suppressed, asOf: statLabels.asOf }}
        image={heroImage}
      />

      <TrustStrip
        heading={t('home.trustHeading')}
        items={[
          {
            icon: 'eye-off',
            title: t('home.trustProtectedTitle'),
            body: t('home.trustProtectedBody'),
          },
          {
            icon: 'check-circle',
            title: t('home.trustCheckableTitle'),
            body: t('home.trustCheckableBody'),
          },
          {
            icon: 'scale',
            title: t('home.trustHonestTitle'),
            body: t('home.trustHonestBody'),
          },
        ]}
      />

      <WhatWeDo
        eyebrow={t('home.workEyebrow')}
        heading={t('home.pillarsHeading')}
        lead={t('home.pillarsLead')}
        items={pillars.map((pillar) => ({
          key: pillar.key,
          href: localeHref(locale, `/${pillar.key}`),
          icon: pillar.icon,
          title: t(`pages.${pillar.key}.title`),
          body: t(`pages.${pillar.key}.lead`),
          linkLabel: t('common.readAbout', {
            page: t(`common.readAboutLower.${pillar.key}`),
          }),
        }))}
      />

      <section
        aria-labelledby="figures"
        className="border-border bg-surface-tint border-y"
      >
        <div className="shell band">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <SectionHeader
              id="figures"
              eyebrow={t('home.metricsHeading')}
              title={t('pages.impact.title')}
              lead={t('pages.impact.lead')}
            />
            {updated ? (
              <p className="num text-ink-muted text-sm">
                {t('common.lastUpdated')}: {updated}
              </p>
            ) : null}
          </div>

          {headline.length > 0 ? (
            <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {headline.map((metric) => (
                <StatCard
                  key={metric.metricId}
                  metric={metric}
                  locale={locale}
                  labels={statLabels}
                />
              ))}
            </div>
          ) : (
            <p className="text-ink-muted mt-8 max-w-[65ch]">{t('impact.noFigures')}</p>
          )}

          <p className="mt-10">
            <ButtonLink
              href={localeHref(locale, '/impact')}
              variant="secondary"
              trailingArrow
            >
              {t('home.allFigures')}
            </ButtonLink>
          </p>
        </div>
      </section>

      <Evidence
        eyebrow={t('home.evidenceEyebrow')}
        heading={t('home.evidenceHeading')}
        quote={t('home.evidenceQuote')}
        caption={t('home.evidenceCaption')}
        findings={evidence}
        linkLabel={t('home.evidenceLink')}
        href={localeHref(locale, evidencePaper ? `/research/${evidencePaper.slug}` : '/research')}
      />

      <CtaBand
        heading={t('home.ctaHeading')}
        body={t('home.ctaBody')}
        primary={{
          label: t('home.ctaPrimary'),
          href: localeHref(locale, '/about#contact'),
        }}
        secondary={{
          label: t('home.ctaSecondary'),
          href: localeHref(locale, '/research'),
        }}
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

import type { Metadata, Viewport } from 'next';
import { notFound } from 'next/navigation';
import { hasLocale } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import '@/app/globals.css';
import { fontVariables } from '@/app/fonts';
import { Analytics } from '@/components/analytics';
import { DemoBanner } from '@/components/demo-banner';
import { JsonLd } from '@/components/json-ld';
import { SiteFooter } from '@/components/site-footer';
import { SiteHeader } from '@/components/site-header';
import { SkipLink } from '@/components/skip-link';
import { ThemeKeeper } from '@/components/theme-keeper';
import { ThemeScript } from '@/components/theme-script';
import { htmlLang, routing, type Locale } from '@/i18n/routing';
import { pageBackground } from '@/lib/brand-colors';
import { getSite } from '@/lib/cms';
import { ngoJsonLd, webSiteJsonLd } from '@/lib/seo/jsonld';
import { buildRootMetadata } from '@/lib/seo/metadata';

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

/**
 * The colours the browser itself paints with: the address bar on a phone,
 * and the scrollbars and form controls a stylesheet does not reach.
 *
 * `themeColor` can only follow the system setting, not the reader's choice —
 * a meta tag cannot read localStorage — so it answers for the two systems.
 * The values come from src/lib/brand-colors.ts, which tests/unit/tokens.test
 * holds to the `--bg` of each palette.
 */
export const viewport: Viewport = {
  colorScheme: 'light dark',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: pageBackground.light },
    { media: '(prefers-color-scheme: dark)', color: pageBackground.dark },
  ],
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale });

  // Every page inherits this template, so each one only states its own title.
  return buildRootMetadata(locale as Locale, t('site.name'), t('site.tagline'));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }
  setRequestLocale(locale);

  const [site, t] = await Promise.all([getSite(locale), getTranslations({ locale })]);

  return (
    <html lang={htmlLang[locale]} className={fontVariables} suppressHydrationWarning>
      <head>
        {/* Before the first paint, or the page flashes the system theme. */}
        <ThemeScript />
      </head>
      <body className="flex min-h-dvh flex-col font-sans antialiased">
        {/*
          Switching language re-mounts <html>, which costs it the theme mark;
          this puts it back before the next paint.
        */}
        <ThemeKeeper />
        {/*
          A click is answered here, at the top edge of the window, while the
          page it asked for is on its way — see src/components/nav-pending.tsx.
          Two pixels of honey, fixed, above everything, and outside the flow,
          so it cannot move a single word on the page.
        */}
        <div className="nav-progress" aria-hidden="true" />
        <JsonLd data={[ngoJsonLd(site, locale), webSiteJsonLd(site, locale)]} />
        <SkipLink />
        <DemoBanner
          missionLine={site.missionLine}
          line={t('demo.banner')}
          secondaryLine={t('demo.bannerEn')}
        />
        <SiteHeader locale={locale} logo={site.logo} />
        <main id="main" tabIndex={-1} className="flex-1">
          {children}
        </main>
        <SiteFooter
          locale={locale}
          contactEmail={site.contactEmail}
          socialLinks={site.socialLinks}
          city={site.organization?.addressCity}
          logo={site.logo}
        />
        <Analytics />
      </body>
    </html>
  );
}

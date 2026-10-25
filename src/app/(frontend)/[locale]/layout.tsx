import type { Metadata } from 'next';
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
import { htmlLang, routing, type Locale } from '@/i18n/routing';
import { getSite } from '@/lib/cms';
import { ngoJsonLd, webSiteJsonLd } from '@/lib/seo/jsonld';
import { buildRootMetadata } from '@/lib/seo/metadata';

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

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

  const site = await getSite(locale);

  return (
    <html lang={htmlLang[locale]} className={fontVariables}>
      <body className="flex min-h-dvh flex-col font-sans antialiased">
        <JsonLd data={[ngoJsonLd(site, locale), webSiteJsonLd(site, locale)]} />
        <SkipLink />
        <DemoBanner missionLine={site.missionLine} />
        <SiteHeader locale={locale} />
        <main id="main" tabIndex={-1} className="flex-1">
          {children}
        </main>
        <SiteFooter locale={locale} contactEmail={site.contactEmail} />
        <Analytics />
      </body>
    </html>
  );
}

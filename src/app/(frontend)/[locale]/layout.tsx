import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { hasLocale, NextIntlClientProvider } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import '@/app/globals.css';
import { fontVariables } from '@/app/fonts';
import { SiteFooter } from '@/components/site-footer';
import { SiteHeader } from '@/components/site-header';
import { SkipLink } from '@/components/skip-link';
import { htmlLang, routing } from '@/i18n/routing';
import { getSite } from '@/lib/cms';
import { siteUrl } from '@/lib/site';

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

  return {
    metadataBase: new URL(siteUrl),
    title: {
      default: `${t('site.name')} — ${t('site.tagline')}`,
      template: `%s — ${t('site.name')}`,
    },
    description: t('site.description'),
  };
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
        <NextIntlClientProvider>
          <SkipLink />
          <SiteHeader />
          <main id="main" tabIndex={-1} className="flex-1">
            {children}
          </main>
          <SiteFooter contactEmail={site.contactEmail} />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}

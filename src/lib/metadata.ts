import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { routing, type Locale } from '@/i18n/routing';
import { siteUrl } from '@/lib/site';
import type { PageKey } from '@/lib/nav';

function localeUrls(path: string) {
  const clean = path === '/' ? '' : path;
  return Object.fromEntries(
    routing.locales.map((locale) => [locale, `${siteUrl}/${locale}${clean}`]),
  );
}

/** Metadata for a public page. The domain always comes from the environment. */
export async function pageMetadata(
  locale: Locale,
  pageKey: PageKey,
  path: string,
): Promise<Metadata> {
  const t = await getTranslations({ locale });
  const title = t(`pages.${pageKey}.title`);
  const siteName = t('site.name');

  return {
    metadataBase: new URL(siteUrl),
    title:
      pageKey === 'home'
        ? `${siteName} — ${t('site.tagline')}`
        : `${title} — ${siteName}`,
    description: t(`pages.${pageKey}.lead`),
    alternates: {
      canonical: `${siteUrl}/${locale}${path === '/' ? '' : path}`,
      languages: localeUrls(path),
    },
  };
}

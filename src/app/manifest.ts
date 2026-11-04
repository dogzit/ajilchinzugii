import type { MetadataRoute } from 'next';
import { getTranslations } from 'next-intl/server';
import { defaultLocale, htmlLang } from '@/i18n/routing';
import { pageBackground } from '@/lib/brand-colors';

/**
 * The web manifest, in the site's default language.
 *
 * A manifest has one name, so it is the Mongolian one: the organisation's
 * own. A reader who installs the site from the English pages still lands on
 * `/`, which sends them to their own language.
 *
 * No `display: standalone`: this is a site to read and to link into, not an
 * app to run full screen with its own back button.
 */
export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const t = await getTranslations({ locale: defaultLocale });

  return {
    id: '/',
    name: `${t('site.name')} — ${t('site.tagline')}`,
    short_name: t('site.name'),
    description: t('pages.home.description'),
    lang: htmlLang[defaultLocale],
    dir: 'ltr',
    start_url: '/',
    scope: '/',
    display: 'minimal-ui',
    background_color: pageBackground.light,
    theme_color: pageBackground.light,
    icons: [{ src: '/logo.png', type: 'image/png', sizes: '244x244', purpose: 'any' }],
  };
}

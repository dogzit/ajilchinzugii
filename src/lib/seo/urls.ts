import { routing, type Locale } from '@/i18n/routing';
import { siteUrl } from '@/lib/site';

/**
 * Every address the site publishes is built here, from NEXT_PUBLIC_SITE_URL
 * (CLAUDE.md rule 9). Moving to another domain is an env change and a
 * redirect — no code, no database row, no sitemap entry to hunt down.
 */

/** `/impact` → `https://example.org/mn/impact`. */
export function absoluteUrl(locale: Locale, path = '/'): string {
  const clean = path === '/' ? '' : path.startsWith('/') ? path : `/${path}`;
  return `${siteUrl}/${locale}${clean}`;
}

/**
 * The same page in every language, plus `x-default`.
 *
 * x-default points at Mongolian, the default locale (CLAUDE.md rule 6): it is
 * the language of the organisation, of the ministry it works with and of most
 * of its readers, and it is where `/` sends a browser that asks for neither
 * language. Pointing it anywhere else would tell a crawler the site's main
 * version is the translation.
 */
export function languageAlternates(path = '/'): Record<string, string> {
  return {
    ...Object.fromEntries(
      routing.locales.map((locale) => [locale, absoluteUrl(locale, path)]),
    ),
    'x-default': absoluteUrl(routing.defaultLocale, path),
  };
}

/** The OG locale codes Facebook and friends expect. */
export const ogLocale: Record<Locale, string> = { mn: 'mn_MN', en: 'en_US' };

/** The generated share image for a page. */
export function ogImageUrl(params: {
  locale: Locale;
  title: string;
  subtitle?: string | null;
  kind?: 'page' | 'paper' | 'figures';
}): string {
  const search = new URLSearchParams({
    title: params.title,
    locale: params.locale,
    kind: params.kind ?? 'page',
  });
  if (params.subtitle) search.set('subtitle', params.subtitle);
  return `${siteUrl}/api/og?${search.toString()}`;
}

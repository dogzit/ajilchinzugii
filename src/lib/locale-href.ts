import type { Locale } from '@/i18n/routing';

/**
 * A locale-prefixed path: `('mn', '/impact')` → `/mn/impact`.
 *
 * Server components build their links with this and plain `next/link`, rather
 * than next-intl's navigation helpers. Those helpers are client components, so
 * a single one of them anywhere in the tree pulls next-intl's whole client
 * runtime into every page's JavaScript — on a site whose pages are static
 * text, that is the largest thing a reader downloads.
 */
export function localeHref(locale: Locale, path: string): string {
  if (path.startsWith('#')) return path;
  const clean = path === '/' ? '' : path.startsWith('/') ? path : `/${path}`;
  return `/${locale}${clean}`;
}

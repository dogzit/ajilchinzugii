import { defineRouting } from 'next-intl/routing';
import { defaultLocale, locales } from './locales';

/**
 * Mongolian is the default locale, but it is still prefixed (`/mn/...`) so that
 * every page has one canonical URL per language and the language switch can
 * always keep the reader on the same path.
 *
 * The locale list itself lives in `./locales`, which imports nothing: client
 * components read it from there instead of pulling next-intl into the browser.
 */
export const routing = defineRouting({
  locales: [...locales],
  defaultLocale,
  localePrefix: 'always',
  // First visit only: the locale is taken from Accept-Language and then pinned
  // in the NEXT_LOCALE cookie, so later visits follow the reader's own choice.
  localeDetection: true,
  /*
   * next-intl can announce the other languages in a `Link:` response header.
   * It is off because it builds those addresses from the host the request
   * arrived on: a preview deployment would advertise its own URLs as the
   * site's languages, and its x-default pointed at `/` while the page's own
   * hreflang points at /mn. Every page already carries the full set in its
   * <head>, built from NEXT_PUBLIC_SITE_URL (CLAUDE.md rule 9).
   */
  alternateLinks: false,
});

export { defaultLocale, htmlLang, locales, otherLocale } from './locales';
export type { Locale } from './locales';

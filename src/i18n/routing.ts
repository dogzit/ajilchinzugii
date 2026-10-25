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
});

export { defaultLocale, htmlLang, locales, otherLocale } from './locales';
export type { Locale } from './locales';

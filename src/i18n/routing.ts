import { defineRouting } from 'next-intl/routing';

/**
 * Mongolian is the default locale, but it is still prefixed (`/mn/...`) so that
 * every page has one canonical URL per language and the language switch can
 * always keep the reader on the same path.
 */
export const routing = defineRouting({
  locales: ['mn', 'en'],
  defaultLocale: 'mn',
  localePrefix: 'always',
  // First visit only: the locale is taken from Accept-Language and then pinned
  // in the NEXT_LOCALE cookie, so later visits follow the reader's own choice.
  localeDetection: true,
});

export type Locale = (typeof routing.locales)[number];

export const otherLocale: Record<Locale, Locale> = {
  mn: 'en',
  en: 'mn',
};

/** HTML `lang` / `hreflang` value for each locale. */
export const htmlLang: Record<Locale, string> = {
  mn: 'mn-MN',
  en: 'en',
};

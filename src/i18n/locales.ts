/**
 * The locale list on its own, with no next-intl import.
 *
 * A client component that needs to know the languages can import this without
 * dragging next-intl's routing module — and with it a sizeable slice of the
 * library — into the browser bundle.
 */
export const locales = ['mn', 'en'] as const;

export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = 'mn';

export const otherLocale: Record<Locale, Locale> = { mn: 'en', en: 'mn' };

/** HTML `lang` / `hreflang` value for each locale. */
export const htmlLang: Record<Locale, string> = { mn: 'mn-MN', en: 'en' };

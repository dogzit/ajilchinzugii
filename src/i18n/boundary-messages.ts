import en from '../../messages/en.json';
import mn from '../../messages/mn.json';
import { defaultLocale, locales, type Locale } from './locales';

/**
 * The handful of strings an error boundary needs, in both languages.
 *
 * An error boundary has to be a client component, and it is handed no props —
 * so it cannot be given its text by a server component the way every other
 * client component on this site is. It still must not write its own English
 * and Mongolian (CLAUDE.md rule 6), so it reads the same catalogues as
 * everything else, through this module, which names the one group it needs.
 *
 * Bundling: the catalogues are JSON modules and the bundler drops the groups
 * nothing reads, so what ships is these few lines, not the whole file.
 * tests/unit/boundary-messages.test.ts holds the two languages to the same
 * shape; tests/unit/bundle-budget.test.ts watches the size.
 */
const catalogues = { mn: mn.error, en: en.error } as const;

export type BoundaryMessages = (typeof catalogues)['mn'];

export function boundaryMessages(locale: string | undefined): BoundaryMessages {
  const known = locales.includes(locale as Locale) ? (locale as Locale) : defaultLocale;
  return catalogues[known];
}

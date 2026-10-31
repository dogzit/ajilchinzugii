import { Literata, Onest } from 'next/font/google';

// `next/font` requires literal option values, so the Cyrillic + Latin subsets
// are repeated per family rather than shared through a constant.

/**
 * Headings. A serif with real Cyrillic drawing — Ө and Ү included — set at
 * one weight, because a second weight buys nothing a size change cannot.
 */
export const literata = Literata({
  subsets: ['cyrillic', 'latin'],
  weight: ['600'],
  variable: '--font-literata',
  display: 'swap',
});

/**
 * Everything else: body copy, labels, navigation and figures.
 *
 * Figures used to be set in a monospace face for tabular numerals. Onest has
 * them too (`font-variant-numeric: tabular-nums`), so a column of numbers
 * still lines up without carrying a third family over the wire.
 */
export const onest = Onest({
  subsets: ['cyrillic', 'latin'],
  weight: ['400', '500', '600'],
  variable: '--font-onest',
  display: 'swap',
});

export const fontVariables = [literata.variable, onest.variable].join(' ');

import { IBM_Plex_Mono, IBM_Plex_Sans, Unbounded } from 'next/font/google';

// `next/font` requires literal option values, so the Cyrillic + Latin subsets
// are repeated per family rather than shared through a constant.

/** Display face — headings only. One weight, to keep the payload small. */
export const unbounded = Unbounded({
  subsets: ['cyrillic', 'latin'],
  weight: ['600'],
  variable: '--font-unbounded',
  display: 'swap',
});

/** Body copy. */
export const plexSans = IBM_Plex_Sans({
  subsets: ['cyrillic', 'latin'],
  weight: ['400', '600'],
  variable: '--font-plex-sans',
  display: 'swap',
});

/** Figures, dates and citations (tabular numerals). */
export const plexMono = IBM_Plex_Mono({
  subsets: ['cyrillic', 'latin'],
  weight: ['400', '500'],
  variable: '--font-plex-mono',
  display: 'swap',
});

export const fontVariables = [
  unbounded.variable,
  plexSans.variable,
  plexMono.variable,
].join(' ');

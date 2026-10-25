import type { PageKey } from '@/lib/nav';

/**
 * The three pillars on the home page, in the order they are read.
 *
 * Each one is a page that already exists: the home page introduces the work,
 * the page itself carries it. Titles and leads are not repeated here — they
 * come from `pages.<key>` so there is one place to edit them.
 */
export const pillars = [
  { key: 'methodology', index: '01' },
  { key: 'research', index: '02' },
  { key: 'policy', index: '03' },
] as const satisfies readonly { key: PageKey; index: string }[];

export type Pillar = (typeof pillars)[number];

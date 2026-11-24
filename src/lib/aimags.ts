/**
 * The 21 aimags and the capital, by id. Names live in the message catalogues
 * (`common.aimags.<id>`). Used by the CV profile, member accounts and the
 * anonymous counters — always optional, never asked for twice.
 */
export const AIMAGS = [
  'ulaanbaatar',
  'arkhangai',
  'bayan_ulgii',
  'bayankhongor',
  'bulgan',
  'govi_altai',
  'govisumber',
  'darkhan_uul',
  'dornogovi',
  'dornod',
  'dundgovi',
  'zavkhan',
  'orkhon',
  'uvurkhangai',
  'umnugovi',
  'sukhbaatar',
  'selenge',
  'tuv',
  'uvs',
  'khovd',
  'khuvsgul',
  'khentii',
] as const;

export type Aimag = (typeof AIMAGS)[number];

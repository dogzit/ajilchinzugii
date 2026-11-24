/**
 * The anti-hallucination check (spec, "Extraction call"): a value the model
 * returns is kept only if the excerpt it cites appears in the source text.
 * Comparison is after normalisation — case, Unicode form, whitespace, quote
 * and dash styles — so a line break or a curly quote does not throw out a
 * real excerpt, and nothing else does let a made-up one through.
 */

export function normalize(text: string): string {
  return text
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[​-‍﻿­]/g, '')
    .replace(/[«»“”„"'‘’`]/g, '"')
    .replace(/[‐‑‒–—―]/g, '-')
    .replace(/\s+/g, ' ')
    .trim();
}

/** True when a non-trivial excerpt occurs in the source. */
export function excerptMatches(excerpt: string, source: string): boolean {
  const needle = normalize(excerpt);
  // Two characters could match anywhere; an excerpt must quote something.
  if (needle.replace(/[^\p{L}\p{N}]/gu, '').length < 2) return false;
  return normalize(source).includes(needle);
}

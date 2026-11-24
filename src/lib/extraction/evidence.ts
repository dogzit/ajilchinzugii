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

/**
 * True when a non-trivial excerpt occurs in the source. A quote cut short
 * with "…" is matched without the dots. A number at either end of the quote
 * must not be part of a longer number in the source: "20" is not in "2026".
 */
export function excerptMatches(excerpt: string, source: string): boolean {
  const needle = normalize(excerpt).replace(/^(?:\.{3}|…)\s*|\s*(?:\.{3}|…)$/g, '');
  // Two characters could match anywhere; an excerpt must quote something.
  if (needle.replace(/[^\p{L}\p{N}]/gu, '').length < 2) return false;
  const haystack = normalize(source);
  const digit = /\d/;
  for (let at = haystack.indexOf(needle); at !== -1; at = haystack.indexOf(needle, at + 1)) {
    const before = haystack[at - 1] ?? '';
    const after = haystack[at + needle.length] ?? '';
    if (digit.test(needle[0]!) && digit.test(before)) continue;
    if (digit.test(needle.at(-1)!) && digit.test(after)) continue;
    return true;
  }
  return false;
}

/** True when the digits of a number appear in its quote: 7000 in "7,000 төгрөг". */
export function numberInExcerpt(value: number, excerpt: string): boolean {
  const digits = (text: string) => text.replace(/\D/g, '');
  return digits(excerpt).includes(digits(String(value)));
}

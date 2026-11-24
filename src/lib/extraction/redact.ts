/**
 * Redaction before the LLM (spec, "Privacy and storage"): register numbers,
 * phone numbers, email addresses and bank account numbers are replaced with
 * a placeholder before any text leaves the server for the model, and before
 * an opted-in case file is stored. Runs on the server for every input, even
 * text the browser already read.
 *
 * Real documents and OCR are untidy, so each pattern accepts what people and
 * phone cameras actually produce: Latin letters that look like Cyrillic ones
 * in a register number, digits broken by spaces, dots or dashes, a № sign,
 * a +976 code in or out of brackets, a Ulaanbaatar landline.
 *
 * Order matters: the longer, more specific patterns go first so a phone
 * pattern never eats half of an account number.
 */

/** One separator inside a number: a space, or a dot or dash with optional spaces around it. */
const SEP = '(?:\\s?[.\\-–—]\\s?|\\s)';
const DATE = /\d{4}\s?[.\-/]\s?\d{1,2}\s?[.\-/]\s?\d{1,2}/;

type Rule = { label: string; pattern: RegExp; keep?: (match: string) => boolean };

const RULES: Rule[] = [
  {
    label: '[EMAIL]',
    pattern: /[\p{L}\p{N}._%+-]+\s?(?:@|\[at\]|\(at\))\s?[\p{L}\p{N}-]+(?:\s?(?:\.|\[dot\]|\(dot\))\s?[\p{L}\p{N}-]+)*\s?(?:\.|\[dot\]|\(dot\))\s?\p{L}{2,}/giu,
  },
  // IBAN: MN + 2 check digits + 16 digits, spaced or not.
  { label: '[ACCOUNT]', pattern: new RegExp(`\\bMN\\s?\\d{2}(?:${SEP}?\\d){16}(?!\\d)`, 'gi') },
  // Register number: 2 letters + 8 digits (АС 12345678), with the letters in
  // Cyrillic, in Latin, or mixed (OCR reads С as C), digits possibly spaced
  // or dashed, and an optional №.
  {
    label: '[ID]',
    pattern: /(?<![\p{L}\p{N}])[А-ЯЁӨҮа-яёөүA-Za-z]{2}(?:\s?№\s?|[\s-]?)\d(?:[\s.-]?\d){7}(?!\d)/gu,
  },
  // Account numbers written in groups (501-234-5678, 50 1234 5678,
  // 4000 1234 5678 9010): nine digits or more, unless the run is a date.
  {
    label: '[ACCOUNT]',
    pattern: /(?<!\+|\d|\d[.,])\d{2,8}(?:[\s.\-–]\d{2,8})+(?!\d|[.,]\d)/g,
    keep: (match) => match.replace(/\D/g, '').length < 9 || DATE.test(match),
  },
  { label: '[ACCOUNT]', pattern: /(?<!\d|\d[.,])\d{9,20}(?!\d|[.,]\d)/g },
  // Phones: 8 digits starting 5–9 (mobiles, 7xxx landlines), any grouping,
  // with or without +976; and Ulaanbaatar's 11 + 6-digit landlines. A full
  // stop or comma after the number ends the sentence; only a digit after it
  // (450,000 or 1.5) makes it part of a larger number.
  {
    label: '[PHONE]',
    pattern: new RegExp(
      `(?:\\(?\\+?976\\)?${SEP}?)?(?<!\\d|\\d[.,])(?:[5-9](?:${SEP}?\\d){7}|\\(?11\\)?${SEP}?\\d{2}${SEP}?\\d{2}${SEP}?\\d{2})(?!\\d|[.,]\\d)`,
      'g',
    ),
  },
];

export type Redaction = { text: string; counts: Record<string, number> };

export function redact(input: string): Redaction {
  const counts: Record<string, number> = {};
  let text = input;
  for (const { label, pattern, keep } of RULES) {
    text = text.replace(pattern, (match) => {
      if (keep?.(match)) return match;
      counts[label] = (counts[label] ?? 0) + 1;
      return label;
    });
  }
  return { text, counts };
}

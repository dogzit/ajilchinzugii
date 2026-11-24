/**
 * Redaction before the LLM (spec, "Privacy and storage"): register numbers,
 * phone numbers, email addresses and bank account numbers are replaced with
 * a placeholder before any text leaves the server for the model, and before
 * an opted-in case file is stored. Runs on the server for every input, even
 * text the browser already read.
 *
 * Order matters: the longer, more specific patterns go first so a phone
 * pattern never eats half of an account number.
 */

const RULES: { label: string; pattern: RegExp }[] = [
  { label: '[EMAIL]', pattern: /[\p{L}\p{N}._%+-]+@[\p{L}\p{N}.-]+\.[\p{L}]{2,}/gu },
  // Register number: 2 Cyrillic letters + 8 digits (АС 12345678), also typed
  // in Latin letters by people writing Mongolian in Latin script.
  { label: '[ID]', pattern: /(?<![\p{L}\p{N}])[А-ЯЁӨҮа-яёөү]{2}[\s-]?\d{8}(?!\d)/gu },
  { label: '[ID]', pattern: /(?<![\p{L}\p{N}])[A-Za-z]{2}[\s-]?\d{8}(?!\d)/gu },
  // IBAN (MN + 2 check digits + 16 digits, spaced or not), then a run of
  // 9–20 digits, or 4-digit groups — longer than a phone number, and no pay
  // amount a teen is offered is written as 100,000,000 without separators.
  { label: '[ACCOUNT]', pattern: /\bMN\s?\d{2}(?:[\s-]?\d{2,4}){4,8}\b/gi },
  { label: '[ACCOUNT]', pattern: /(?<!\d|\d[.,])(?:\d{9,20}|\d{4}(?:[\s-]\d{4}){2,4})(?!\d|[.,]\d)/g },
  // Phone: Mongolian mobile and landline numbers, 8 digits, optionally
  // grouped and with the +976 country code.
  // A full stop or comma after the number ends the sentence; only a digit
  // after it (450,000 or 1.5) makes it part of a larger number.
  { label: '[PHONE]', pattern: /(?:\+?976[\s-]?)?(?<!\d|\d[.,])[5-9]\d(?:[\s-]?\d){6}(?!\d|[.,]\d)/g },
];

export type Redaction = { text: string; counts: Record<string, number> };

export function redact(input: string): Redaction {
  const counts: Record<string, number> = {};
  let text = input;
  for (const { label, pattern } of RULES) {
    text = text.replace(pattern, () => {
      counts[label] = (counts[label] ?? 0) + 1;
      return label;
    });
  }
  return { text, counts };
}

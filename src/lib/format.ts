import type { Locale } from '../i18n/routing';

/**
 * Formatting for figures, dates and rich text, shared by every page.
 *
 * Numbers are grouped the way each language groups them and always rendered
 * with tabular numerals, so a column of figures lines up.
 */

const numberLocale: Record<Locale, string> = { mn: 'mn-MN', en: 'en-GB' };

export function formatNumber(value: number, locale: Locale): string {
  return new Intl.NumberFormat(numberLocale[locale], {
    maximumFractionDigits: Number.isInteger(value) ? 0 : 1,
  }).format(value);
}

/** 2026-09-30 → "2026 оны 9 сарын 30" / "30 September 2026". */
export function formatDate(
  value: string | null | undefined,
  locale: Locale,
): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  if (locale === 'mn') {
    return `${date.getUTCFullYear()} оны ${date.getUTCMonth() + 1} сарын ${date.getUTCDate()}`;
  }
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date);
}

/** A timestamp, down to the minute, for "last updated". */
export function formatDateTime(
  value: string | null | undefined,
  locale: Locale,
): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  return new Intl.DateTimeFormat(numberLocale[locale], {
    dateStyle: 'medium',
    timeStyle: 'short',
    // The organisation and its readers are in Ulaanbaatar.
    timeZone: 'Asia/Ulaanbaatar',
  }).format(date);
}

/** 2026-09 → "2026 оны 9 сар" / "Sep 2026", for chart axes and tables. */
export function formatMonth(month: string, locale: Locale, short = false): string {
  const [year, m] = month.split('-');
  if (!year || !m) return month;

  if (locale === 'mn') {
    return short ? `${m}/${year.slice(2)}` : `${year} оны ${Number(m)} сар`;
  }
  const date = new Date(Date.UTC(Number(year), Number(m) - 1, 1));
  return new Intl.DateTimeFormat('en-GB', {
    month: short ? 'short' : 'long',
    year: short ? '2-digit' : 'numeric',
    timeZone: 'UTC',
  }).format(date);
}

type LexicalNode = {
  type?: string;
  tag?: string;
  text?: string;
  children?: LexicalNode[];
};

export type RichTextValue = { root?: LexicalNode } | null | undefined;

/** Flattens a Lexical node to its plain text, for headings and summaries. */
export function lexicalText(node: LexicalNode | undefined): string {
  if (!node) return '';
  if (typeof node.text === 'string') return node.text;
  return (node.children ?? []).map(lexicalText).join('');
}

export type Heading = { id: string; text: string; level: number };

/**
 * The headings of a rich text field, for a table of contents. The ids match
 * what the rich text renderer puts on each heading.
 */
export function richTextHeadings(value: RichTextValue): Heading[] {
  const children = value?.root?.children ?? [];

  return children
    .filter((node) => node.type === 'heading' && /^h[1-6]$/.test(node.tag ?? ''))
    .map((node) => {
      const text = lexicalText(node).trim();
      return { id: headingId(text), text, level: Number((node.tag ?? 'h2').slice(1)) };
    })
    .filter((heading) => heading.text.length > 0);
}

/**
 * A URL fragment for a heading. Cyrillic is kept rather than stripped — a
 * Mongolian heading would otherwise reduce to an empty id.
 */
export function headingId(text: string): string {
  const slug = text
    .toLowerCase()
    .replace(/[^\p{Letter}\p{Number}]+/gu, '-')
    .replace(/^-+|-+$/g, '');
  return slug || 'heading';
}

/** True when a rich text field holds nothing but empty paragraphs. */
export function isRichTextEmpty(value: RichTextValue): boolean {
  return lexicalText(value?.root).trim().length === 0;
}

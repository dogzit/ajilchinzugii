// @vitest-environment node
import { describe, expect, it } from 'vitest';
import {
  formatDate,
  formatMonth,
  formatNumber,
  headingId,
  isRichTextEmpty,
  lexicalText,
  richTextHeadings,
} from '../../src/lib/format';

describe('numbers', () => {
  it('groups digits the way each language does', () => {
    // Non-breaking or thin spaces differ by platform, so compare the digits.
    expect(formatNumber(7_450_000, 'mn').replace(/\D/g, '')).toBe('7450000');
    expect(formatNumber(7_450_000, 'en')).toBe('7,450,000');
  });

  it('keeps whole numbers whole', () => {
    expect(formatNumber(42, 'en')).toBe('42');
    expect(formatNumber(0, 'en')).toBe('0');
  });
});

describe('dates', () => {
  it('writes a Mongolian date the Mongolian way', () => {
    expect(formatDate('2026-09-30', 'mn')).toBe('2026 оны 9 сарын 30');
  });

  it('writes an English date the English way', () => {
    expect(formatDate('2026-09-30', 'en')).toBe('30 September 2026');
  });

  it('returns null rather than "Invalid Date"', () => {
    expect(formatDate('not a date', 'mn')).toBeNull();
    expect(formatDate(null, 'mn')).toBeNull();
    expect(formatDate(undefined, 'en')).toBeNull();
  });

  it('reads the date in UTC, so a timezone cannot shift the day', () => {
    expect(formatDate('2026-01-01T00:30:00.000Z', 'en')).toBe('1 January 2026');
  });
});

describe('months', () => {
  it('formats long and short forms', () => {
    expect(formatMonth('2026-09', 'mn')).toBe('2026 оны 9 сар');
    expect(formatMonth('2026-09', 'mn', true)).toBe('09/26');
    expect(formatMonth('2026-09', 'en')).toBe('September 2026');
    // CLDR abbreviates September as "Sept" in en-GB; match the month, not the
    // exact abbreviation, so an ICU update does not break the suite.
    expect(formatMonth('2026-09', 'en', true)).toMatch(/^Sept? 26$/);
  });

  it('passes an unexpected value through untouched', () => {
    expect(formatMonth('whenever', 'en')).toBe('whenever');
  });
});

describe('heading ids', () => {
  it('keeps Cyrillic instead of emptying the id', () => {
    expect(headingId('Хамрах хүрээ')).toBe('хамрах-хүрээ');
  });

  it('slugifies Latin headings', () => {
    expect(headingId('Scope & limits')).toBe('scope-limits');
  });

  it('never returns an empty id', () => {
    expect(headingId('!!!')).toBe('heading');
  });
});

const doc = {
  root: {
    type: 'root',
    children: [
      { type: 'heading', tag: 'h2', children: [{ text: 'Хамрах хүрээ' }] },
      { type: 'paragraph', children: [{ text: 'Энэ бол догол мөр.' }] },
      { type: 'heading', tag: 'h3', children: [{ text: 'Sub section' }] },
      { type: 'heading', tag: 'h2', children: [{ text: '   ' }] },
    ],
  },
};

describe('rich text', () => {
  it('lists the headings with the ids the renderer uses', () => {
    expect(richTextHeadings(doc)).toEqual([
      { id: 'хамрах-хүрээ', text: 'Хамрах хүрээ', level: 2 },
      { id: 'sub-section', text: 'Sub section', level: 3 },
    ]);
  });

  it('flattens nested text', () => {
    expect(lexicalText(doc.root)).toContain('Энэ бол догол мөр.');
  });

  it('knows an empty document from a full one', () => {
    expect(isRichTextEmpty(doc)).toBe(false);
    expect(
      isRichTextEmpty({ root: { children: [{ type: 'paragraph', children: [] }] } }),
    ).toBe(true);
    expect(isRichTextEmpty(null)).toBe(true);
  });
});

import { describe, expect, it } from 'vitest';
import { isAnchorId, isDoi, isHttpUrl, isSlug, slugify } from '../../src/lib/validators';

describe('slugs', () => {
  it('accepts lowercase hyphenated ascii only', () => {
    expect(isSlug('collective-bargaining-2026')).toBe(true);
    expect(isSlug('Collective')).toBe(false);
    expect(isSlug('a--b')).toBe(false);
    expect(isSlug('-a')).toBe(false);
    expect(isSlug('')).toBe(false);
  });

  it('slugifies Latin titles', () => {
    expect(slugify('Collective Bargaining: A Review')).toBe(
      'collective-bargaining-a-review',
    );
  });

  it('keeps Cyrillic letters rather than emptying the slug', () => {
    expect(slugify('Хамтын хэлэлцээр')).toBe('хамтын-хэлэлцээр');
  });
});

describe('urls', () => {
  it('accepts only absolute http(s)', () => {
    expect(isHttpUrl('https://example.org/a')).toBe(true);
    expect(isHttpUrl('http://example.org')).toBe(true);
    expect(isHttpUrl('/research')).toBe(false);
    expect(isHttpUrl('javascript:alert(1)')).toBe(false);
    expect(isHttpUrl('ftp://example.org')).toBe(false);
  });
});

describe('dois', () => {
  it('accepts bare, prefixed and url forms', () => {
    expect(isDoi('10.1234/abc')).toBe(true);
    expect(isDoi('doi: 10.1234/abc')).toBe(true);
    expect(isDoi('https://doi.org/10.1234/abc')).toBe(true);
  });

  it('rejects anything that is not a doi', () => {
    expect(isDoi('abc')).toBe(false);
    expect(isDoi('10.12/')).toBe(false);
    expect(isDoi('https://example.org/paper')).toBe(false);
  });
});

describe('anchor ids', () => {
  it('accepts stable url fragments', () => {
    expect(isAnchorId('counting-cases')).toBe(true);
    expect(isAnchorId('Counting Cases')).toBe(false);
    expect(isAnchorId('a'.repeat(61))).toBe(false);
  });
});

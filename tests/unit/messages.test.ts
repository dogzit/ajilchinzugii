import { describe, expect, it } from 'vitest';
import en from '../../messages/en.json';
import mn from '../../messages/mn.json';
import { navItems } from '../../src/lib/nav';

type Tree = { [key: string]: string | Tree };

function keyPaths(tree: Tree, prefix = ''): string[] {
  return Object.entries(tree).flatMap(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    return typeof value === 'string' ? [path] : keyPaths(value, path);
  });
}

const mnKeys = keyPaths(mn as Tree).sort();
const enKeys = keyPaths(en as Tree).sort();

describe('message catalogues', () => {
  it('mn and en define exactly the same keys', () => {
    expect(enKeys).toEqual(mnKeys);
  });

  it('has no empty strings', () => {
    for (const [locale, messages] of [
      ['mn', mn],
      ['en', en],
    ] as const) {
      const values = JSON.stringify(messages).match(/:"[^"]*"/g) ?? [];
      expect(
        values.some((value) => value === ':""'),
        `${locale} has empty value`,
      ).toBe(false);
    }
  });

  it('labels every navigation item in both languages', () => {
    for (const item of navItems) {
      expect(mn.nav).toHaveProperty(item.key);
      expect(en.nav).toHaveProperty(item.key);
    }
  });

  it('labels the language switch in both languages in both catalogues', () => {
    // Each switch label mentions both languages, so it reads correctly to a
    // screen reader whichever locale the page is in.
    for (const messages of [mn, en]) {
      for (const label of Object.values(messages.language.switchTo)) {
        expect(label).toMatch(/[Ѐ-ӿ]/); // Cyrillic
        expect(label).toMatch(/[A-Za-z]/); // Latin
      }
    }
  });

  it('marks unfinished content with the agreed placeholder', () => {
    expect(mn.placeholder.tbd).toBe('[ХҮЛЭЭГДЭЖ БУЙ / TBD]');
    expect(en.placeholder.tbd).toBe('[ХҮЛЭЭГДЭЖ БУЙ / TBD]');
  });
});

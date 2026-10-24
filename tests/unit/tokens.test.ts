import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const css = readFileSync(resolve(process.cwd(), 'src/app/globals.css'), 'utf8');

function tokens(theme: 'light' | 'dark'): Record<string, string> {
  const start = css.indexOf(`/* tokens:${theme} */`);
  const end = css.indexOf(theme === 'light' ? '/* tokens:dark */' : '/* tokens:end */');
  expect(start, `tokens:${theme} block`).toBeGreaterThan(-1);
  expect(end).toBeGreaterThan(start);

  const block = css.slice(start, end);
  const found: Record<string, string> = {};
  for (const match of block.matchAll(/--([a-z-]+):\s*(#[0-9a-f]{6})/g)) {
    found[match[1] as string] = match[2] as string;
  }
  return found;
}

const channel = (value: number) =>
  value / 255 <= 0.03928 ? value / 255 / 12.92 : ((value / 255 + 0.055) / 1.055) ** 2.4;

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => channel(parseInt(hex.slice(i, i + 2), 16)));
  return 0.2126 * (r as number) + 0.7152 * (g as number) + 0.0722 * (b as number);
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}

const backgrounds = ['bg', 'surface', 'surface-muted'] as const;
const textTokens = ['ink', 'ink-soft', 'ink-muted', 'accent', 'focus'] as const;
const uiTokens = ['border-strong', 'accent-mark'] as const;

describe.each(['light', 'dark'] as const)('%s theme tokens', (theme) => {
  const t = tokens(theme);

  it('defines every token', () => {
    for (const name of [...backgrounds, ...textTokens, ...uiTokens, 'border']) {
      expect(t, name).toHaveProperty(name);
    }
  });

  it.each(textTokens)('%s meets WCAG AA for text (4.5:1) on every background', (fg) => {
    for (const bg of backgrounds) {
      expect(
        contrast(t[fg] as string, t[bg] as string),
        `${fg} on ${bg}`,
      ).toBeGreaterThanOrEqual(4.5);
    }
  });

  it.each(uiTokens)('%s meets WCAG AA for UI components (3:1)', (fg) => {
    for (const bg of backgrounds) {
      expect(
        contrast(t[fg] as string, t[bg] as string),
        `${fg} on ${bg}`,
      ).toBeGreaterThanOrEqual(3);
    }
  });

  it('keeps body text on the accent surface readable', () => {
    expect(
      contrast(t['ink'] as string, t['accent-surface'] as string),
    ).toBeGreaterThanOrEqual(4.5);
  });
});

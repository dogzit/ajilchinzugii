import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { scoreColor, scoreStops } from '@/lib/score-color';

/**
 * The gauge colour is `color-mix(in oklch, …)` between the `--score-*`
 * tokens. This reproduces that mix (OKLab ↔ sRGB, shorter hue arc) and holds
 * every score from 1 to 100 to 3:1 against every surface, in both themes.
 */

const css = readFileSync(resolve(process.cwd(), 'src/app/globals.css'), 'utf8');

function palette(theme: 'light' | 'dark'): Record<string, string> {
  const start = css.indexOf(`/* tokens:${theme} */`);
  const end = css.indexOf(theme === 'light' ? '/* tokens:dark */' : '/* tokens:end */');
  const found: Record<string, string> = {};
  for (const m of css.slice(start, end).matchAll(/--([a-z-]+):\s*(#[0-9a-f]{6})/g)) {
    found[m[1] as string] = m[2] as string;
  }
  return found;
}

const toLinear = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const toGamma = (c: number) => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);

function hexToOklch(hex: string): [number, number, number] {
  const [r, g, b] = [1, 3, 5].map((i) => toLinear(parseInt(hex.slice(i, i + 2), 16) / 255)) as [
    number,
    number,
    number,
  ];
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  return [L, Math.hypot(A, B), ((Math.atan2(B, A) * 180) / Math.PI + 360) % 360];
}

function oklchToRgb([L, C, H]: [number, number, number]): [number, number, number] {
  const A = C * Math.cos((H * Math.PI) / 180);
  const B = C * Math.sin((H * Math.PI) / 180);
  const l = (L + 0.3963377774 * A + 0.2158037573 * B) ** 3;
  const m = (L - 0.1055613458 * A - 0.0638541728 * B) ** 3;
  const s = (L - 0.0894841775 * A - 1.291485548 * B) ** 3;
  const rgb = [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
  return rgb.map((c) => Math.min(1, Math.max(0, toGamma(c)))) as [number, number, number];
}

function mix(a: string, b: string, t: number): [number, number, number] {
  const [la, ca, ha] = hexToOklch(a);
  const [lb, cb, hb] = hexToOklch(b);
  let dh = hb - ha;
  if (dh > 180) dh -= 360;
  if (dh < -180) dh += 360;
  return [la + (lb - la) * t, ca + (cb - ca) * t, (ha + dh * t + 360) % 360];
}

const luminance = (rgb: [number, number, number]) => {
  const [r, g, b] = rgb.map(toLinear) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const hexRgb = (hex: string) =>
  [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255) as [number, number, number];
const contrast = (a: [number, number, number], b: [number, number, number]) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
};

describe.each(['light', 'dark'] as const)('score colours, %s theme', (theme) => {
  const t = palette(theme);

  it('meets 3:1 against every surface at every score', () => {
    for (let score = 1; score <= 100; score += 1) {
      const [from, to, fraction] = scoreStops(score);
      const colour = oklchToRgb(
        mix(t[`score-${from}`] as string, t[`score-${to}`] as string, fraction),
      );
      for (const surface of ['bg', 'surface', 'surface-tint']) {
        expect(
          contrast(colour, hexRgb(t[surface] as string)),
          `${score} on ${surface}`,
        ).toBeGreaterThanOrEqual(3);
      }
    }
  });

  it('never gives a red score (1–39) a green hue', () => {
    const greenHue = hexToOklch(t['score-green'] as string)[2];
    for (let score = 1; score <= 39; score += 1) {
      const [from, to, fraction] = scoreStops(score);
      expect([from, to]).toEqual(['red', 'amber']);
      const hue = mix(t['score-red'] as string, t['score-amber'] as string, fraction)[2];
      expect(Math.abs(hue - greenHue), `${score}`).toBeGreaterThan(40);
    }
  });
});

describe('scoreColor', () => {
  it('names only tokens, never a hex', () => {
    for (const score of [1, 39, 40, 57, 74, 75, 100]) {
      expect(scoreColor(score)).toMatch(/^color-mix\(in oklch, var\(--score-[a-z]+\) [\d.]+%, var\(--score-[a-z]+\)\)$/);
    }
  });
});

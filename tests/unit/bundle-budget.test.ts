// @vitest-environment node
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * A regression guard on what a reader downloads.
 *
 * CLAUDE.md rule 8 asks for 100 KB of client JavaScript per route. The
 * measured floor for Next's App Router here is about 177 KB before a line of
 * our own code runs (see docs/audit.md), so the rule cannot be met on this
 * stack. What this test can do is stop the number growing: it fails if the
 * shared bundle creeps past the measured ceiling, which is how the earlier
 * 191 KB — next-intl's client runtime — was found and removed.
 */

/** Measured at 130 KB; the headroom catches a new dependency, not a tweak. */
const SHARED_CEILING_KB = 140;
const chunksDir = resolve(process.cwd(), '.next/static/chunks');
const manifestPath = resolve(process.cwd(), '.next/build-manifest.json');

describe('client bundle', () => {
  it.runIf(existsSync(manifestPath))(
    'shared entry stays under the measured ceiling',
    () => {
      // The files every page loads, straight from the build manifest — the
      // chunks directory also holds the Payload admin, which readers never get.
      const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as {
        rootMainFiles: string[];
      };

      const total = manifest.rootMainFiles
        .map(
          (file) => gzipSync(readFileSync(resolve(process.cwd(), '.next', file))).length,
        )
        .reduce((sum, size) => sum + size, 0);

      expect(total / 1024).toBeLessThan(SHARED_CEILING_KB);
    },
  );

  it('keeps next-intl out of the browser', () => {
    // The translation runtime belongs on the server: pages are static text,
    // and shipping an ICU parser to read it cost 14 KB on every route.
    if (!existsSync(chunksDir)) return;
    const offenders = readdirSync(chunksDir)
      .filter((name) => name.endsWith('.js'))
      .filter((name) =>
        /next-intl|use-intl|IntlMessageFormat/.test(
          readFileSync(resolve(chunksDir, name), 'utf8'),
        ),
      );
    expect(offenders).toEqual([]);
  });
});

/**
 * What each page actually loads, read from its prerendered HTML: the
 * <script> tags Next wrote for it. Runs after a build.
 */
const appDir = resolve(process.cwd(), '.next/server/app');
const scriptsOf = (page: string): string[] => {
  const html = readFileSync(resolve(appDir, `${page}.html`), 'utf8');
  return [...new Set([...html.matchAll(/\/_next\/(static\/chunks\/[^"' ]+\.js)/g)].map((m) => m[1] as string))];
};
const gzipKb = (files: string[]) =>
  files.reduce((sum, file) => sum + gzipSync(readFileSync(resolve(process.cwd(), '.next', file))).length, 0) / 1024;
const CLERK = /ClerkProvider|@clerk\/|clerk\.browser/;

describe('accounts and the raters', () => {
  const built = existsSync(resolve(appDir, 'mn.html'));

  it.runIf(built)('Clerk\'s client code exists in the build, and no public page or rater loads it', () => {
    // Proof the pattern finds Clerk at all: its chunks are in the build,
    // for the sign-in, sign-up and account pages.
    const clerkChunks = readdirSync(chunksDir).filter((name) => name.endsWith('.js') && CLERK.test(readFileSync(resolve(chunksDir, name), 'utf8')));
    expect(clerkChunks.length).toBeGreaterThan(0);

    const pages = ['mn', 'en', 'mn/impact', 'mn/methodology', 'mn/research', 'mn/policy', 'mn/about', 'mn/privacy', 'mn/contract-check', 'en/contract-check', 'mn/cv-check', 'en/cv-check'];
    for (const page of pages) {
      const loaded = scriptsOf(page).filter((file) => CLERK.test(readFileSync(resolve(process.cwd(), '.next', file), 'utf8')));
      expect(loaded, page).toEqual([]);
    }
  });

  /**
   * CLAUDE.md rule 8 asks for 100 KB per route; the stack's own floor is
   * above that (see the top of this file), so what is held here is what the
   * raters add on top of the home page. The OCR (tesseract.js, its worker,
   * its WebAssembly core and the Mongolian model, several megabytes) is the
   * one deliberate exception: it is never part of a page's first load, only
   * fetched when the reader picks a photo.
   */
  const RATER_EXTRA_KB = 25;

  it.runIf(built)('the raters add at most 25 KB to the home page, and the OCR is not in the first load', () => {
    const OCR = /tesseract\.js-core|tesseract\.min\.js/;
    // Proof the pattern finds the OCR: its lazily loaded chunk is in the build.
    expect(readdirSync(chunksDir).some((name) => name.endsWith('.js') && OCR.test(readFileSync(resolve(chunksDir, name), 'utf8')))).toBe(true);
    const home = scriptsOf('mn');
    for (const page of ['mn/contract-check', 'mn/cv-check']) {
      const scripts = scriptsOf(page);
      const extra = gzipKb(scripts.filter((file) => !home.includes(file)));
      expect(extra, page).toBeLessThan(RATER_EXTRA_KB);
      for (const file of scripts) {
        expect(readFileSync(resolve(process.cwd(), '.next', file), 'utf8'), `${page}: ${file}`).not.toMatch(OCR);
      }
    }
  });
});


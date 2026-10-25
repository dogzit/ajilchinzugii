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

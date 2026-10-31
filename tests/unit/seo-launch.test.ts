// @vitest-environment node
import { execFileSync } from 'node:child_process';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import en from '../../messages/en.json';
import mn from '../../messages/mn.json';

/**
 * What has to be true before this site is handed to a search engine.
 *
 * Three separate promises, and each one has been broken on a live deployment
 * at least once: the domain is never written into the code, indexing does not
 * start until someone opens it, and every page says something of its own in a
 * search result.
 */

const catalogues = { mn, en };

/** Matching lines under src/, or '' — git grep exits 1 when it finds none. */
function grep(pattern: string): string {
  try {
    return execFileSync('git', ['grep', '-In', '-E', pattern, '--', 'src'], {
      encoding: 'utf8',
      cwd: process.cwd(),
    }).trim();
  } catch (error) {
    if ((error as { status?: number }).status === 1) return '';
    throw error;
  }
}

describe('the domain', () => {
  it('appears nowhere in the source', () => {
    // Every public URL is built from NEXT_PUBLIC_SITE_URL (CLAUDE.md rule 9).
    // A hostname in the source is how a deployment ends up telling Google
    // that the preview URL is the real site.
    const hits = grep('vercel\\.app|ajilchinzugii\\.(com|mn)');

    expect(hits).toBe('');
  });
});

describe('indexing', () => {
  const load = async () => {
    vi.resetModules();
    return (await import('../../src/app/robots')).default;
  };

  const withEnv = (env: Record<string, string | undefined>) => {
    for (const [key, value] of Object.entries(env)) vi.stubEnv(key, value);
  };

  beforeEach(() => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://ajilchinzugii.com');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it('is closed on a preview deployment, flag or no flag', async () => {
    withEnv({ VERCEL_ENV: 'preview', NEXT_PUBLIC_ALLOW_INDEXING: 'true' });
    const rules = (await load())();

    expect(rules.rules).toEqual([{ userAgent: '*', disallow: '/' }]);
    expect(rules.sitemap).toBeUndefined();
  });

  it('is closed in production until the flag is set', async () => {
    withEnv({ VERCEL_ENV: 'production', NEXT_PUBLIC_ALLOW_INDEXING: undefined });
    const rules = (await load())();

    expect(rules.rules).toEqual([{ userAgent: '*', disallow: '/' }]);
  });

  it('opens in production once the flag is set, minus the admin and the API', async () => {
    withEnv({ VERCEL_ENV: 'production', NEXT_PUBLIC_ALLOW_INDEXING: 'true' });
    const rules = (await load())();

    const rule = Array.isArray(rules.rules) ? rules.rules[0] : rules.rules;
    expect(rule?.allow).toBe('/');
    expect(rule?.disallow).toContain('/admin');
    expect(rule?.disallow).toContain('/api/');
    expect(rules.sitemap).toBe('https://ajilchinzugii.com/sitemap.xml');
  });
});

describe('every page says something of its own', () => {
  const pages = Object.keys(mn.pages) as (keyof typeof mn.pages)[];

  it.each(Object.keys(catalogues) as (keyof typeof catalogues)[])(
    'in %s',
    (locale) => {
      const group = catalogues[locale].pages as Record<
        string,
        { title: string; description: string }
      >;
      const descriptions = new Set<string>();
      const titles = new Set<string>();

      for (const page of pages) {
        const entry = group[page];
        expect(entry?.description, `${locale}/${page}`).toBeTruthy();

        // What a search result shows: too short says nothing, too long is cut.
        const length = (entry?.description ?? '').length;
        expect(length, `${locale}/${page} description length`).toBeGreaterThanOrEqual(50);
        expect(length, `${locale}/${page} description length`).toBeLessThanOrEqual(160);

        descriptions.add(entry?.description ?? '');
        titles.add(entry?.title ?? '');
      }

      // Two pages sharing a description is two pages competing for one result.
      expect(descriptions.size).toBe(pages.length);
      expect(titles.size).toBe(pages.length);
    },
  );
});

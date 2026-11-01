// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { assertLaunchReady, launchProblems } from '../../scripts/launch-guard';

/**
 * The deployment this guard was written for: indexing open, the real domain
 * bought and serving, and every canonical link still naming the hosting
 * platform's own address — which redirected to the real domain, so each one
 * pointed at a redirect and nothing could be indexed.
 */

const live = {
  VERCEL_ENV: 'production',
  NEXT_PUBLIC_ALLOW_INDEXING: 'true',
  NEXT_PUBLIC_SITE_URL: 'https://ajilchinzugii.com',
};

const errors = (env: Record<string, string | undefined>) =>
  launchProblems(env)
    .filter((problem) => problem.kind === 'error')
    .map((problem) => problem.message);

describe('a draft deployment', () => {
  it('may say anything about itself, because nobody is reading it', () => {
    expect(launchProblems({ ...live, NEXT_PUBLIC_ALLOW_INDEXING: 'false' })).toEqual([]);
    expect(launchProblems({ ...live, VERCEL_ENV: 'preview' })).toEqual([]);
    // Not deployed at all: a local production build of the demo.
    expect(launchProblems({ NEXT_PUBLIC_SITE_URL: 'http://localhost:3000' })).toEqual([]);
  });
});

describe('a deployment that may be indexed', () => {
  it('passes when it is pointed at the site’s own domain', () => {
    expect(launchProblems(live)).toEqual([]);
    expect(() => assertLaunchReady(live)).not.toThrow();
  });

  it('is refused when every URL would name the hosting platform', () => {
    const env = { ...live, NEXT_PUBLIC_SITE_URL: 'https://ajilchinzugii.vercel.app' };

    expect(errors(env)).toHaveLength(1);
    expect(errors(env)[0]).toContain('ajilchinzugii.vercel.app');
    expect(() => assertLaunchReady(env)).toThrow(/ALLOW_INDEXING/);
  });

  it.each([
    'https://site.netlify.app',
    'https://site.pages.dev',
    'http://localhost:3000',
    'http://127.0.0.1:3000',
  ])('refuses %s as well', (url) => {
    expect(errors({ ...live, NEXT_PUBLIC_SITE_URL: url })).toHaveLength(1);
  });

  it('is refused when the canonical host and the site URL disagree', () => {
    // Requests go one way, canonical links point the other: every canonical
    // URL is a redirect, and a crawler indexes none of them.
    const env = { ...live, SITE_CANONICAL_HOST: 'www.ajilchinzugii.com' };

    expect(errors(env)).toHaveLength(1);
    expect(errors(env)[0]).toContain('www.ajilchinzugii.com');
  });

  it('accepts a canonical host that agrees, whatever its case', () => {
    expect(launchProblems({ ...live, SITE_CANONICAL_HOST: 'AjilchinZugii.com' })).toEqual(
      [],
    );
  });

  it('is refused when NEXT_PUBLIC_SITE_URL is missing or not a URL', () => {
    expect(errors({ ...live, NEXT_PUBLIC_SITE_URL: undefined })).toHaveLength(1);
    expect(errors({ ...live, NEXT_PUBLIC_SITE_URL: 'ajilchinzugii.com' })).toHaveLength(
      1,
    );
  });

  it('warns, but does not refuse, when the counter is on another domain', () => {
    const env = { ...live, NEXT_PUBLIC_PLAUSIBLE_DOMAIN: 'ajilchinzugii.vercel.app' };

    expect(errors(env)).toEqual([]);
    expect(launchProblems(env).map((problem) => problem.kind)).toEqual(['warning']);
    expect(() => assertLaunchReady(env)).not.toThrow();
  });

  it('lists every problem at once, rather than one build at a time', () => {
    const env = {
      ...live,
      NEXT_PUBLIC_SITE_URL: 'https://ajilchinzugii.vercel.app',
      SITE_CANONICAL_HOST: 'ajilchinzugii.com',
    };

    expect(errors(env)).toHaveLength(2);
  });
});

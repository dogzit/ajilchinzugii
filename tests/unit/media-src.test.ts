// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { mediaSrc } from '../../src/lib/media';
import { siteUrl } from '../../src/lib/site';

/**
 * This guards a bug that only shows as a broken image: Payload returns media
 * URLs as absolute, next/image then treats them as remote and refuses to load
 * anything whose host is not in `remotePatterns` — which is every file served
 * from the site's own media route.
 */
describe('mediaSrc', () => {
  it('turns a same-origin URL into a path', () => {
    expect(mediaSrc(`${siteUrl}/api/media/file/9f2a71c4.webp`)).toBe(
      '/api/media/file/9f2a71c4.webp',
    );
  });

  it('keeps a query string', () => {
    expect(mediaSrc(`${siteUrl}/api/media/file/a.webp?v=2`)).toBe(
      '/api/media/file/a.webp?v=2',
    );
  });

  it('leaves a bucket URL alone — that host is allowed explicitly', () => {
    const remote = 'https://media.example.org/9f2a71c4.webp';
    expect(mediaSrc(remote)).toBe(remote);
  });

  it('passes a path through untouched', () => {
    expect(mediaSrc('/api/media/file/a.webp')).toBe('/api/media/file/a.webp');
  });

  it('answers null for nothing', () => {
    expect(mediaSrc(null)).toBeNull();
    expect(mediaSrc(undefined)).toBeNull();
    expect(mediaSrc('   ')).toBeNull();
  });
});

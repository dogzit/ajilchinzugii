// @vitest-environment node
import { describe, expect, it } from 'vitest';
import {
  adminContentSecurityPolicy,
  adminHeaders,
  contentSecurityPolicy,
  publicHeaders,
} from '../../src/lib/security-headers';

const header = (list: { key: string; value: string }[], key: string) =>
  list.find((h) => h.key.toLowerCase() === key.toLowerCase())?.value;

describe('the public policy', () => {
  const csp = contentSecurityPolicy();
  const directive = (name: string) =>
    csp
      .split('; ')
      .find((part) => part.startsWith(`${name} `))
      ?.slice(name.length + 1);

  it('allows nothing by default', () => {
    expect(directive('default-src')).toBe("'self'");
  });

  it('closes what actually carries risk', () => {
    expect(directive('object-src')).toBe("'none'");
    expect(directive('frame-ancestors')).toBe("'none'");
    expect(directive('base-uri')).toBe("'self'");
    expect(directive('form-action')).toBe("'self'");
    expect(csp).toContain('upgrade-insecure-requests');
  });

  it('admits the analytics host and no other origin for scripts', () => {
    const scripts = directive('script-src') ?? '';
    expect(scripts).toContain('https://plausible.io');
    expect(scripts.split(' ').filter((s) => s.startsWith('http'))).toEqual([
      'https://plausible.io',
    ]);
  });

  it('does not let a page be framed', () => {
    expect(header(publicHeaders, 'X-Frame-Options')).toBe('DENY');
  });

  it('sends the other four headers', () => {
    expect(header(publicHeaders, 'X-Content-Type-Options')).toBe('nosniff');
    expect(header(publicHeaders, 'Referrer-Policy')).toBe(
      'strict-origin-when-cross-origin',
    );
    expect(header(publicHeaders, 'Strict-Transport-Security')).toContain(
      'max-age=63072000',
    );
    // Not yet preloaded: the client decides, and it is hard to undo.
    expect(header(publicHeaders, 'Strict-Transport-Security')).not.toContain('preload');
  });

  it('denies the hardware a text site never needs', () => {
    const permissions = header(publicHeaders, 'Permissions-Policy') ?? '';
    for (const feature of ['camera=()', 'microphone=()', 'geolocation=()']) {
      expect(permissions).toContain(feature);
    }
  });
});

describe('the admin policy', () => {
  it('gives the editor the blob URLs it needs, and nothing more', () => {
    const csp = adminContentSecurityPolicy();
    expect(csp).toContain("script-src 'self' blob:");
    expect(csp).toContain("connect-src 'self' blob: data:");
    expect(csp).toContain("object-src 'none'");
  });

  it('keeps drafts and editor screens out of search results', () => {
    expect(header(adminHeaders, 'X-Robots-Tag')).toBe('noindex, nofollow');
  });

  it('may be framed by itself, for the live preview', () => {
    expect(header(adminHeaders, 'X-Frame-Options')).toBe('SAMEORIGIN');
  });
});

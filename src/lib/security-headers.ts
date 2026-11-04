/**
 * The response headers every page is served with.
 *
 * Kept here rather than inline in next.config.ts so the values can be read,
 * reasoned about and tested on their own.
 */

const plausibleHost = (
  process.env.NEXT_PUBLIC_PLAUSIBLE_HOST?.trim() || 'https://plausible.io'
).replace(/\/$/, '');

const r2PublicHost = process.env.R2_PUBLIC_URL?.trim()
  ? new URL(process.env.R2_PUBLIC_URL.trim()).origin
  : null;

/**
 * Content Security Policy for the public site.
 *
 * `'unsafe-inline'` for scripts is a deliberate trade, not an oversight.
 * Next's App Router boots from inline scripts; the alternative is a per-request
 * nonce, which Next only supports by opting every page into dynamic rendering.
 * These pages are static text served from the edge — giving that up to tighten
 * a policy on a site with no user input, no forms and no third-party scripts
 * beyond a cookieless analytics file would cost far more than it buys.
 *
 * Everything that actually carries risk is closed: no framing, no plugins, no
 * other origins for scripts, connections or form posts.
 */
export function contentSecurityPolicy(): string {
  const directives: Record<string, string[]> = {
    'default-src': ["'self'"],
    'script-src': ["'self'", "'unsafe-inline'", plausibleHost],
    // Tailwind ships a stylesheet; next/font writes an inline @font-face block.
    'style-src': ["'self'", "'unsafe-inline'"],
    'img-src': ["'self'", 'data:', 'blob:', ...(r2PublicHost ? [r2PublicHost] : [])],
    'font-src': ["'self'", 'data:'],
    'connect-src': ["'self'", plausibleHost],
    'media-src': ["'self'", ...(r2PublicHost ? [r2PublicHost] : [])],
    'object-src': ["'none'"],
    'base-uri': ["'self'"],
    'form-action': ["'self'"],
    'frame-ancestors': ["'none'"],
    // The research paper page embeds its own PDF inline, served either from
    // this origin (Payload's proxy route) or the R2 public host.
    'frame-src': ["'self'", ...(r2PublicHost ? [r2PublicHost] : [])],
    'worker-src': ["'self'", 'blob:'],
    'manifest-src': ["'self'"],
  };

  return [
    ...Object.entries(directives).map(([name, values]) => `${name} ${values.join(' ')}`),
    'upgrade-insecure-requests',
  ].join('; ');
}

/**
 * The admin panel needs a little more room: Payload's editor builds workers and
 * previews from blob: URLs, and uploads are read back as blobs. It is behind a
 * login and is never indexed.
 */
export function adminContentSecurityPolicy(): string {
  return contentSecurityPolicy()
    .replace("script-src 'self'", "script-src 'self' blob:")
    .replace("connect-src 'self'", "connect-src 'self' blob: data:")
    .replace("frame-src 'self'", "frame-src 'self' blob:");
}

const shared = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // No page on this site uses any of these.
  {
    key: 'Permissions-Policy',
    value: [
      'camera=()',
      'microphone=()',
      'geolocation=()',
      'payment=()',
      'usb=()',
      'interest-cohort=()',
    ].join(', '),
  },
  {
    key: 'Strict-Transport-Security',
    // Two years, subdomains included. `preload` is left off until the client
    // decides to submit the domain — it is hard to undo.
    value: 'max-age=63072000; includeSubDomains',
  },
  { key: 'X-Frame-Options', value: 'DENY' },
];

export const publicHeaders = [
  ...shared,
  { key: 'Content-Security-Policy', value: contentSecurityPolicy() },
];

/**
 * Files served from Payload's own route (`/api/media/file/*`) — currently
 * just the research paper's PDF, embedded inline via an iframe. A file's own
 * response headers govern whether it can be framed at all, so it needs
 * `frame-ancestors 'self'` rather than the site-wide `'none'`: that header
 * is not about this site framing others, it is this *file* refusing to be
 * framed by anyone, including this site's own page.
 */
export const mediaHeaders = [
  ...shared.filter((header) => header.key !== 'X-Frame-Options'),
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  {
    key: 'Content-Security-Policy',
    value: contentSecurityPolicy().replace(
      "frame-ancestors 'none'",
      "frame-ancestors 'self'",
    ),
  },
];

export const adminHeaders = [
  ...shared.filter((header) => header.key !== 'X-Frame-Options'),
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'Content-Security-Policy', value: adminContentSecurityPolicy() },
  // Drafts and editor screens are never indexed.
  { key: 'X-Robots-Tag', value: 'noindex, nofollow' },
];

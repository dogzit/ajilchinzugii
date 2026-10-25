import { siteUrl } from '@/lib/site';

/**
 * The src to hand `next/image` for a file in the Media collection.
 *
 * Payload returns an absolute URL built from `serverURL`. next/image reads an
 * absolute URL as a remote image and refuses to load it unless its host is in
 * `remotePatterns` — so a file served from the site's own `/api/media/file/...`
 * route (which is what happens until the bucket has a public domain) silently
 * renders as a broken image. Same-origin URLs are reduced to a path, which
 * next/image treats as local.
 */
export function mediaSrc(url: string | null | undefined): string | null {
  const value = url?.trim();
  if (!value) return null;
  if (value.startsWith('/')) return value;

  try {
    const parsed = new URL(value);
    if (parsed.origin === new URL(siteUrl).origin) {
      return `${parsed.pathname}${parsed.search}`;
    }
    return value;
  } catch {
    return value;
  }
}

/**
 * Shared value checks used by Payload field validation. Kept free of Payload
 * imports so they can be unit tested on their own.
 */

/** URL-safe identifier used in routes: /research/<slug>. */
export function isSlug(value: string): boolean {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value);
}

export function slugify(value: string): string {
  return value
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9Ѐ-ӿ]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

/** Only absolute http(s) URLs: a relative or javascript: URL must never render. */
export function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

/** A DOI, bare or as a doi.org URL. */
export function isDoi(value: string): boolean {
  const bare = value
    .trim()
    .replace(/^https?:\/\/(dx\.)?doi\.org\//i, '')
    .replace(/^doi:\s*/i, '');
  return /^10\.\d{4,9}\/\S+$/.test(bare);
}

/**
 * Methodology anchors are part of published URLs
 * (/mn/methodology#<anchorId>), so they must stay stable and URL-safe.
 */
export function isAnchorId(value: string): boolean {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value) && value.length <= 60;
}

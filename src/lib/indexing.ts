/**
 * Whether this deployment may be indexed.
 *
 * Two conditions, and both have to hold:
 *
 *   VERCEL_ENV === 'production'       not a preview build, not a local one
 *   NEXT_PUBLIC_ALLOW_INDEXING=true   the client has said the content is real
 *
 * The second one is the point. A search engine's first reading of a site is
 * hard to undo: pages indexed with "ЖИШЭЭ: ..." and info@example.org teach it
 * that this is what the organisation is called and how to reach it, and that
 * sticks around long after the real text arrives. So indexing is off until
 * someone turns it on, deliberately, once the content is the client's own.
 *
 * `VERCEL_ENV` is not a NEXT_PUBLIC variable and is only read on the server —
 * robots.txt, the robots meta tag and the middleware, which is everywhere the
 * answer is needed.
 */
export const indexingAllowed =
  process.env.VERCEL_ENV === 'production' &&
  process.env.NEXT_PUBLIC_ALLOW_INDEXING?.trim() === 'true';

/** The one header that says "not this host", for a preview deployment. */
export const NO_INDEX_HEADER = 'noindex, nofollow';

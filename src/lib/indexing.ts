/**
 * Whether this deployment may be indexed.
 *
 * Two conditions, and both have to hold:
 *
 *   this is the production deployment    not a preview, not a local build
 *   NEXT_PUBLIC_ALLOW_INDEXING=true      the content is the client's own
 *
 * The second one is the point. A search engine's first reading of a site is
 * hard to undo: pages indexed with "ЖИШЭЭ: ..." and info@example.org teach it
 * that this is what the organisation is called and how to reach it, and that
 * sticks around long after the real text arrives. So indexing is off until
 * someone turns it on, deliberately, once the content is the client's own.
 *
 * The first condition used to be `VERCEL_ENV === 'production'`, which no
 * platform but Vercel sets. On Cloudflare Workers it is never set, so the
 * whole site would have gone out `noindex` with `Disallow: /` the moment it
 * moved — silently, because nothing about that looks like a failure.
 *
 * `DEPLOY_ENV` is the platform-neutral replacement: set it to `production`
 * on the one deployment that is the real site, and nowhere else. `VERCEL_ENV`
 * is still honoured so the current Vercel deployment keeps working untouched
 * during the move.
 *
 * Neither is a NEXT_PUBLIC variable, so both are server-only — robots.txt,
 * the robots meta tag and the proxy, which is everywhere the answer is needed.
 */
export const isProductionDeployment =
  process.env.DEPLOY_ENV?.trim() === 'production' ||
  process.env.VERCEL_ENV === 'production';

export const indexingAllowed =
  isProductionDeployment && process.env.NEXT_PUBLIC_ALLOW_INDEXING?.trim() === 'true';

/** The one header that says "not this host", for a preview deployment. */
export const NO_INDEX_HEADER = 'noindex, nofollow';

import { clerkMiddleware } from '@clerk/nextjs/server';
import createMiddleware from 'next-intl/middleware';
import { NextResponse, type NextFetchEvent, type NextRequest } from 'next/server';
import { routing } from '@/i18n/routing';
import { CLERK_PROXY_PATH, clerkConfigured } from '@/lib/accounts/clerk';
import { indexingAllowed, NO_INDEX_HEADER } from '@/lib/indexing';
import { siteHost } from '@/lib/site';

// Next 16 calls this file convention `proxy` (formerly `middleware`).
const withLocale = createMiddleware(routing);

/**
 * One host may be indexed: the one NEXT_PUBLIC_SITE_URL names, and only when
 * indexing has been opened.
 *
 * Every deployment answers on at least two more addresses — the project's
 * own hosting subdomain and the per-deployment preview URL — and a crawler
 * that finds the same pages there reads them as a second site competing with
 * the real one. The canonical link says which is which; this header says it
 * again in a way a crawler cannot weigh up or ignore.

 * The hostnames themselves are never written down here: the one host that may
 * be indexed is whichever NEXT_PUBLIC_SITE_URL names (CLAUDE.md rule 9).
 */
function localeAndRobots(request: NextRequest) {
  const response = withLocale(request);

  const host = request.headers.get('host')?.split(':')[0]?.toLowerCase();
  if (!indexingAllowed || host !== siteHost) {
    response.headers.set('X-Robots-Tag', NO_INDEX_HEADER);
  }

  return response;
}

/**
 * Where Clerk runs: its Frontend API, proxied through this origin so the
 * browser never talks to a Clerk domain (and the CSP stays close to 'self'),
 * the account pages, the account API, and the case intake (so a signed-in
 * reader's case is linked to their account). Everywhere else — every public
 * page and both raters — is untouched by it: no session check, no handshake
 * redirect, no Clerk JavaScript. Without keys Clerk is not loaded at all.
 */
const CLERK_PATHS = /^\/(?:__clerk(?:\/|$)|api\/account(?:\/|$)|api\/rater\/cases$|(?:mn|en)\/(?:sign-in|sign-up|account)(?:\/|$))/;

const withClerk = clerkConfigured()
  ? clerkMiddleware(
      async (_auth, request) => (request.nextUrl.pathname.startsWith('/api/') ? NextResponse.next() : localeAndRobots(request)),
      // The proxy URL is derived from each request's own origin: no domain
      // is written here (CLAUDE.md rule 9).
      { frontendApiProxy: { enabled: true, path: CLERK_PROXY_PATH } },
    )
  : null;

export default function proxy(request: NextRequest, event: NextFetchEvent) {
  if (withClerk && CLERK_PATHS.test(request.nextUrl.pathname)) return withClerk(request, event);
  // An API route in the matcher (for Clerk's sake) has no locale to add.
  if (request.nextUrl.pathname.startsWith('/api/')) return NextResponse.next();
  return localeAndRobots(request);
}

export const config = {
  // Everything except the Payload admin and API, Next internals, the
  // editors' handbook and files with an extension. /admin is Payload's own
  // route and must not be rewritten to /mn/admin; /guide is a static file
  // (Next serves public/guide.html there) and has no locale of its own.
  // Clerk's proxied Frontend API and the account API are added by name.
  matcher: [
    '/',
    '/(mn|en)/:path*',
    '/__clerk/:path*',
    '/api/account/:path*',
    // So a signed-in reader's case links to their account.
    '/api/rater/cases',
    '/((?!admin|api|guide|_next|_vercel|__clerk|.*\\..*).*)',
  ],
};

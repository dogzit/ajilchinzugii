import createMiddleware from 'next-intl/middleware';
import type { NextRequest } from 'next/server';
import { routing } from '@/i18n/routing';
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
export default function proxy(request: NextRequest) {
  const response = withLocale(request);

  const host = request.headers.get('host')?.split(':')[0]?.toLowerCase();
  if (!indexingAllowed || host !== siteHost) {
    response.headers.set('X-Robots-Tag', NO_INDEX_HEADER);
  }

  return response;
}

export const config = {
  // Everything except the Payload admin and API, Next internals, the
  // editors' handbook and files with an extension. /admin is Payload's own
  // route and must not be rewritten to /mn/admin; /guide is a static file
  // (Next serves public/guide.html there) and has no locale of its own.
  matcher: ['/', '/(mn|en)/:path*', '/((?!admin|api|guide|_next|_vercel|.*\\..*).*)'],
};

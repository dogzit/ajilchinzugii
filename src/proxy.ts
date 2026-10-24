import createMiddleware from 'next-intl/middleware';
import { routing } from '@/i18n/routing';

// Next 16 calls this file convention `proxy` (formerly `middleware`).
export default createMiddleware(routing);

export const config = {
  // Everything except the Payload admin and API, Next internals and files
  // with an extension. /admin is Payload's own route and must not be
  // rewritten to /mn/admin.
  matcher: ['/', '/(mn|en)/:path*', '/((?!admin|api|_next|_vercel|.*\\..*).*)'],
};

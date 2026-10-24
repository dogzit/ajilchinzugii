import createMiddleware from 'next-intl/middleware';
import { routing } from '@/i18n/routing';

// Next 16 calls this file convention `proxy` (formerly `middleware`).
export default createMiddleware(routing);

export const config = {
  // Everything except API routes, Next internals and files with an extension.
  matcher: ['/', '/(mn|en)/:path*', '/((?!api|_next|_vercel|.*\\..*).*)'],
};

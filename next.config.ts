import { withPayload } from '@payloadcms/next/withPayload';
import createNextIntlPlugin from 'next-intl/plugin';
import type { NextConfig } from 'next';
import { adminHeaders, mediaHeaders, publicHeaders } from './src/lib/security-headers';
import { assertLaunchReady } from './scripts/launch-guard';

/*
 * Before anything else: a build that may be indexed has to be pointed at the
 * site's own domain. See scripts/launch-guard.ts — it runs here rather than
 * in an npm hook so that no build command can skip it.
 */
assertLaunchReady(process.env);

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

// Set by `pnpm build:cf`, so one config can serve both targets while the
// site runs on Vercel and Workers at the same time.
const buildingForWorkers = process.env.BUILD_TARGET === 'cloudflare';

// Media is served from Payload's own route until the bucket has a public
// domain; when R2_PUBLIC_URL is set, next/image needs that host allowed.
const r2PublicUrl = process.env.R2_PUBLIC_URL?.trim();
const r2Host = r2PublicUrl ? new URL(r2PublicUrl).hostname : undefined;

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  typedRoutes: false,

  /*
   * Payload's Postgres adapter requires `drizzle-kit/api` to generate and
   * push schema. A running site never does either — `push` is off and
   * migrations are a CLI job — but the require still has to resolve, and
   * `drizzle-kit` is an unhoisted dev dependency of the adapter. Left alone,
   * the bundler emits an external nothing can resolve and the Workers build
   * fails on it. See src/lib/drizzle-kit-api-stub.ts.
   */
  turbopack: {
    resolveAlias: {
      'drizzle-kit/api': './src/lib/drizzle-kit-api-stub.ts',
      /*
       * `sharp` is a native binary and cannot load in workerd, so the
       * Workers build swaps it for a stub and Payload goes without it.
       * The Vercel build and the CLI keep the real one. Set by the
       * `build:cf` script, never by hand.
       */
      ...(buildingForWorkers ? { sharp: './src/lib/sharp-stub.ts' } : {}),
    },
  },
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: r2Host ? [{ protocol: 'https', hostname: r2Host }] : [],
  },

  async headers() {
    return [
      { source: '/admin/:path*', headers: adminHeaders },
      { source: '/api/media/:path*', headers: mediaHeaders },
      { source: '/((?!admin|api/media).*)', headers: publicHeaders },
    ];
  },

  /**
   * One canonical host.
   *
   * SITE_CANONICAL_HOST decides which way: set it to the apex (example.org) to
   * send www → apex, or to the www host to go the other way. Without it no
   * redirect is added, which is right for a preview deployment.
   *
   * Moving to a new domain later: add the old host to OLD_HOSTS (comma
   * separated) and it is sent, permanently, to the same path on the canonical
   * host — see docs/HANDOVER.md.
   */
  async redirects() {
    const canonical = process.env.SITE_CANONICAL_HOST?.trim();
    if (!canonical) return [];

    const oldHosts = (process.env.OLD_HOSTS ?? '')
      .split(',')
      .map((host) => host.trim())
      .filter(Boolean);

    const otherHost = canonical.startsWith('www.')
      ? canonical.slice('www.'.length)
      : `www.${canonical}`;

    return [...new Set([otherHost, ...oldHosts])].map((host) => ({
      source: '/:path*',
      has: [{ type: 'host' as const, value: host }],
      destination: `https://${canonical}/:path*`,
      permanent: true,
    }));
  },
};

export default withPayload(withNextIntl(nextConfig), { devBundleServerPackages: false });

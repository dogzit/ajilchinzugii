import { withPayload } from '@payloadcms/next/withPayload';
import createNextIntlPlugin from 'next-intl/plugin';
import type { NextConfig } from 'next';
import { adminHeaders, publicHeaders } from './src/lib/security-headers';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

// Media is served from Payload's own route until the bucket has a public
// domain; when R2_PUBLIC_URL is set, next/image needs that host allowed.
const r2PublicUrl = process.env.R2_PUBLIC_URL?.trim();
const r2Host = r2PublicUrl ? new URL(r2PublicUrl).hostname : undefined;

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  typedRoutes: false,
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: r2Host ? [{ protocol: 'https', hostname: r2Host }] : [],
  },

  async headers() {
    return [
      { source: '/admin/:path*', headers: adminHeaders },
      { source: '/((?!admin).*)', headers: publicHeaders },
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

import { withPayload } from '@payloadcms/next/withPayload';
import createNextIntlPlugin from 'next-intl/plugin';
import type { NextConfig } from 'next';

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
};

export default withPayload(withNextIntl(nextConfig), { devBundleServerPackages: false });

import type { MetadataRoute } from 'next';
import { siteUrl } from '@/lib/site';

/**
 * The public site is meant to be indexed. The admin panel, the API and the
 * editors' handbook are not: they hold drafts and the editors' own screens.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin', '/admin/', '/api/', '/_next/', '/guide'],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}

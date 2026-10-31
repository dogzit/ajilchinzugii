import type { MetadataRoute } from 'next';
import { indexingAllowed } from '@/lib/indexing';
import { siteUrl } from '@/lib/site';

/**
 * The public site is meant to be indexed — once its content is the client's
 * own. Until `NEXT_PUBLIC_ALLOW_INDEXING` says so, every crawler is turned
 * away from everything: a search engine that has learned the demo text is
 * slow to unlearn it (see src/lib/indexing.ts).
 *
 * When indexing is open, the admin panel, the API and the editors' handbook
 * stay out: they hold drafts and the editors' own screens.
 */
export default function robots(): MetadataRoute.Robots {
  if (!indexingAllowed) {
    return { rules: [{ userAgent: '*', disallow: '/' }] };
  }

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

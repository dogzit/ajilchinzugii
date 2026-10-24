import type { MetadataRoute } from 'next';
import { routing } from '@/i18n/routing';
import { getPapers } from '@/lib/cms';
import { absoluteUrl, languageAlternates } from '@/lib/seo/urls';

/**
 * Every page in every language, with its siblings listed as alternates so a
 * crawler knows the two locales are the same page rather than duplicates.
 *
 * Addresses come from NEXT_PUBLIC_SITE_URL; nothing here knows the domain.
 */

export const revalidate = 86_400;

const staticPaths = ['/', '/impact', '/methodology', '/research', '/policy', '/about'];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // One read per locale: a paper's title and dates are localized.
  const papersByLocale = await Promise.all(
    routing.locales.map(async (locale) => [locale, await getPapers(locale)] as const),
  );

  const entries: MetadataRoute.Sitemap = [];

  for (const locale of routing.locales) {
    for (const path of staticPaths) {
      entries.push({
        url: absoluteUrl(locale, path),
        changeFrequency: path === '/impact' ? 'daily' : 'monthly',
        priority: path === '/' ? 1 : path === '/impact' ? 0.9 : 0.7,
        alternates: { languages: languageAlternates(path) },
      });
    }
  }

  for (const [locale, papers] of papersByLocale) {
    for (const paper of papers) {
      const path = `/research/${paper.slug}`;
      entries.push({
        url: absoluteUrl(locale, path),
        lastModified: paper.updatedAt ? new Date(paper.updatedAt) : undefined,
        changeFrequency: 'yearly',
        priority: 0.6,
        alternates: { languages: languageAlternates(path) },
      });
    }
  }

  return entries;
}

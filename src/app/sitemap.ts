import type { MetadataRoute } from 'next';
import { routing } from '@/i18n/routing';
import { getMethodology, getPapers, getPolicy, getSite, getTeam } from '@/lib/cms';
import { absoluteUrl, languageAlternates } from '@/lib/seo/urls';

/**
 * Every page in every language, with its siblings listed as alternates so a
 * crawler knows the two locales are the same page rather than duplicates.
 *
 * `lastModified` comes from the CMS, so a crawler is told a page changed when
 * an editor changed it — not when the site happened to be rebuilt. A page
 * with nothing behind it in the CMS carries no date rather than today's.
 *
 * The admin panel and the API are not here, and nothing adds them: this list
 * is written out by hand from the routes under (frontend).
 *
 * Addresses come from NEXT_PUBLIC_SITE_URL; nothing here knows the domain.
 */

export const revalidate = 86_400;

const staticPaths = ['/', '/impact', '/methodology', '/research', '/policy', '/about'];

const date = (value?: string | null): Date | undefined => {
  if (!value) return undefined;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
};

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // One read per locale: a paper's title and dates are localized.
  const [papersByLocale, teamByLocale, site, methodology, policy] = await Promise.all([
    Promise.all(
      routing.locales.map(async (locale) => [locale, await getPapers(locale)] as const),
    ),
    Promise.all(
      routing.locales.map(async (locale) => [locale, await getTeam(locale)] as const),
    ),
    getSite(routing.defaultLocale),
    getMethodology(routing.defaultLocale),
    getPolicy(routing.defaultLocale),
  ]);

  // The newest paper is what changed about the research list.
  const newestPaper = (papersByLocale[0]?.[1] ?? [])
    .map((paper) => paper.updatedAt)
    .filter(Boolean)
    .sort()
    .at(-1);

  const changed: Record<string, string | null | undefined> = {
    '/': site.updatedAt,
    '/methodology': methodology.updatedAt,
    '/policy': policy.updatedAt,
    '/research': newestPaper,
    '/about': site.updatedAt,
  };

  const entries: MetadataRoute.Sitemap = [];

  for (const locale of routing.locales) {
    for (const path of staticPaths) {
      entries.push({
        url: absoluteUrl(locale, path),
        lastModified: date(changed[path]),
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

  // Only the members the About page itself lists: `getTeam` filters to
  // confirmed adults, so a row that must not be public cannot reach the
  // sitemap either (rule 4).
  for (const [locale, team] of teamByLocale) {
    for (const member of team) {
      if (!member.slug) continue;
      const path = `/team/${member.slug}`;
      entries.push({
        url: absoluteUrl(locale, path),
        lastModified: member.updatedAt ? new Date(member.updatedAt) : undefined,
        changeFrequency: 'yearly',
        priority: 0.4,
        alternates: { languages: languageAlternates(path) },
      });
    }
  }

  return entries;
}

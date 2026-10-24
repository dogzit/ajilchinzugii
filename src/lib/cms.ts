import { cache } from 'react';
import { getPayload } from 'payload';
import config from '../payload.config';
import type { Locale } from '../i18n/routing';
import type { Methodology, Paper, Partner, Policy, Site, Team } from '../payload-types';

/**
 * Read access to the CMS for the public site.
 *
 * Everything here is a Server Component concern: the Local API talks to
 * Postgres in-process, so no HTTP round trip and no client bundle. Each reader
 * is wrapped in `cache` so two components asking for the same document in one
 * render share a single query.
 *
 * Drafts never leak: the two drafted globals and the Papers collection are
 * filtered to published documents explicitly, because the Local API runs with
 * access control disabled by default.
 */

const client = cache(async () => getPayload({ config }));

export const getSite = cache(async (locale: Locale): Promise<Site> => {
  const payload = await client();
  return payload.findGlobal({ slug: 'site', locale, depth: 1 });
});

export const getMethodology = cache(async (locale: Locale): Promise<Methodology> => {
  const payload = await client();
  return payload.findGlobal({ slug: 'methodology', locale, depth: 0 });
});

export const getPolicy = cache(async (locale: Locale): Promise<Policy> => {
  const payload = await client();
  return payload.findGlobal({ slug: 'policy', locale, depth: 0 });
});

export const getPapers = cache(async (locale: Locale): Promise<Paper[]> => {
  const payload = await client();
  const { docs } = await payload.find({
    collection: 'papers',
    locale,
    depth: 1,
    limit: 100,
    // Newest first; a paper without a year sorts last.
    sort: ['-year', 'title'],
    where: { _status: { equals: 'published' } },
  });
  return docs;
});

export const getPaper = cache(
  async (slug: string, locale: Locale): Promise<Paper | null> => {
    const payload = await client();
    const { docs } = await payload.find({
      collection: 'papers',
      locale,
      depth: 1,
      limit: 1,
      where: { and: [{ slug: { equals: slug } }, { _status: { equals: 'published' } }] },
    });
    return docs[0] ?? null;
  },
);

/** Every published paper slug, for `generateStaticParams`. */
export const getPaperSlugs = cache(async (): Promise<string[]> => {
  const payload = await client();
  const { docs } = await payload.find({
    collection: 'papers',
    depth: 0,
    limit: 500,
    select: { slug: true },
    where: { _status: { equals: 'published' } },
  });
  return docs.map((doc) => doc.slug).filter(Boolean);
});

/** Adults only — the collection's own read filter says the same thing. */
export const getTeam = cache(async (locale: Locale): Promise<Team[]> => {
  const payload = await client();
  const { docs } = await payload.find({
    collection: 'team',
    locale,
    depth: 1,
    limit: 100,
    sort: 'createdAt',
    where: { confirmedAdult18Plus: { equals: true } },
  });
  return docs;
});

export const getPartners = cache(async (locale: Locale): Promise<Partner[]> => {
  const payload = await client();
  const { docs } = await payload.find({
    collection: 'partners',
    locale,
    depth: 1,
    limit: 100,
    sort: 'name',
  });
  return docs;
});

// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import en from '../../messages/en.json';
import mn from '../../messages/mn.json';
import type { Locale } from '../../src/i18n/routing';

/**
 * Every public route must answer with a title and a description, in both
 * languages, with a canonical URL and both language alternates. A page that
 * ships without them is invisible to a search engine and shows up as a bare
 * URL when someone shares it.
 */

const catalogues: Record<string, Record<string, unknown>> = { mn, en };

/** A stand-in for next-intl's server API, reading the real catalogues. */
vi.mock('next-intl/server', () => ({
  setRequestLocale: () => {},
  getTranslations: async ({ locale }: { locale?: string } = {}) => {
    const messages = catalogues[locale ?? 'mn'] ?? mn;
    return (key: string) =>
      key.split('.').reduce<unknown>((node, part) => (node as never)?.[part], messages) ??
      key;
  },
}));

const site = {
  id: 1,
  missionLine: 'Хөдөлмөр эрхэлж байгаа хүүхдийн эрхийг хамгаална.',
  contactEmail: 'info@example.org',
  organization: { legalName: 'Ажилчин Зөгий ТББ' },
  seo: { metaTitle: null, metaDescription: null },
};

const paper = {
  id: 1,
  title: 'Хамтын хэлэлцээр',
  slug: 'collective-bargaining',
  year: 2026,
  status: 'published',
  authors: [{ id: 'a', name: 'Б. Болормаа' }],
  seo: { metaTitle: null, metaDescription: null },
};

// The pages pull in next-intl's navigation helpers, which do not resolve
// outside a Next runtime and play no part in metadata.
vi.mock('../../src/i18n/navigation', () => ({
  Link: () => null,
  usePathname: () => '/',
  useRouter: () => ({}),
  redirect: () => {},
  getPathname: () => '/',
}));
vi.mock('../../src/payload.config', () => ({ default: {} }));
vi.mock('payload', () => ({ getPayload: async () => ({}) }));
vi.mock('../../src/lib/cms', () => ({
  getSite: async () => site,
  getMethodology: async () => ({ id: 1, seo: {}, sources: [] }),
  getPolicy: async () => ({ id: 1, seo: {}, status: 'drafted' }),
  getPapers: async () => [paper],
  getPaper: async () => paper,
  getPaperSlugs: async () => ['collective-bargaining'],
  getTeam: async () => [],
  getPartners: async () => [],
}));
vi.mock('../../src/lib/impact', () => ({
  getImpact: async () => ({ metrics: [], monthly: [], fetchedAt: null, stale: false }),
}));

const routes: {
  name: string;
  path: string;
  load: () => Promise<{ generateMetadata?: unknown }>;
}[] = [
  {
    name: 'home',
    path: '/',
    load: () => import('../../src/app/(frontend)/[locale]/page'),
  },
  {
    name: 'impact',
    path: '/impact',
    load: () => import('../../src/app/(frontend)/[locale]/impact/page'),
  },
  {
    name: 'methodology',
    path: '/methodology',
    load: () => import('../../src/app/(frontend)/[locale]/methodology/page'),
  },
  {
    name: 'research',
    path: '/research',
    load: () => import('../../src/app/(frontend)/[locale]/research/page'),
  },
  {
    name: 'policy',
    path: '/policy',
    load: () => import('../../src/app/(frontend)/[locale]/policy/page'),
  },
  {
    name: 'about',
    path: '/about',
    load: () => import('../../src/app/(frontend)/[locale]/about/page'),
  },
  {
    name: 'paper',
    path: '/research/collective-bargaining',
    load: () => import('../../src/app/(frontend)/[locale]/research/[slug]/page'),
  },
];

type Meta = Awaited<ReturnType<(args: never) => Promise<Record<string, never>>>>;

async function metadataFor(route: (typeof routes)[number], locale: Locale) {
  const mod = (await route.load()) as {
    generateMetadata: (args: {
      params: Promise<{ locale: Locale; slug?: string }>;
    }) => Promise<Meta>;
  };
  return mod.generateMetadata({
    params: Promise.resolve({ locale, slug: 'collective-bargaining' }),
  });
}

describe.each(routes)('$name', (route) => {
  it.each(['mn', 'en'] as const)(
    'has a title and a description in %s',
    async (locale) => {
      const meta = (await metadataFor(route, locale)) as {
        title?: string;
        description?: string;
      };

      expect(
        String(meta.title ?? '').trim().length,
        `${route.name} title`,
      ).toBeGreaterThan(0);
      expect(
        String(meta.description ?? '').trim().length,
        `${route.name} description`,
      ).toBeGreaterThan(0);
    },
  );

  it('canonicalises to its own locale and lists both languages', async () => {
    const meta = (await metadataFor(route, 'mn')) as {
      alternates?: { canonical?: string; languages?: Record<string, string> };
    };

    const clean = route.path === '/' ? '' : route.path;
    expect(meta.alternates?.canonical).toMatch(new RegExp(`/mn${clean}$`));
    expect(meta.alternates?.languages?.mn).toMatch(new RegExp(`/mn${clean}$`));
    expect(meta.alternates?.languages?.en).toMatch(new RegExp(`/en${clean}$`));
    // x-default sends an unmatched reader to English.
    expect(meta.alternates?.languages?.['x-default']).toBe(
      meta.alternates?.languages?.en,
    );
  });

  it('carries an OG card and a large Twitter image', async () => {
    const meta = (await metadataFor(route, 'en')) as {
      openGraph?: { locale?: string; images?: { url: string }[] };
      twitter?: { card?: string; images?: string[] };
    };

    expect(meta.openGraph?.locale).toBe('en_US');
    expect(meta.openGraph?.images?.[0]?.url).toContain('/api/og?');
    expect(meta.twitter?.card).toBe('summary_large_image');
    expect(meta.twitter?.images?.[0]).toContain('/api/og?');
  });

  it('builds every URL from NEXT_PUBLIC_SITE_URL', async () => {
    const base = (process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000').replace(
      /\/$/,
      '',
    );
    const meta = (await metadataFor(route, 'mn')) as {
      alternates?: { canonical?: string };
    };
    expect(meta.alternates?.canonical?.startsWith(base)).toBe(true);
  });
});

describe('the paper route', () => {
  it('adds the Google Scholar meta tags', async () => {
    const meta = (await metadataFor(routes.at(-1)!, 'mn')) as {
      other?: Record<string, string | string[]>;
    };

    expect(meta.other?.citation_title).toBe('Хамтын хэлэлцээр');
    expect(meta.other?.citation_author).toEqual(['Б. Болормаа']);
    expect(meta.other?.citation_publication_date).toBe('2026');
  });
});

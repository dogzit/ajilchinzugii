import type { Metadata } from 'next';
import type { Locale } from '@/i18n/routing';
import { getSite } from '@/lib/cms';
import { indexingAllowed } from '@/lib/indexing';
import { publishable } from '@/lib/placeholder';
import { siteUrl } from '@/lib/site';
import { absoluteUrl, languageAlternates, ogImageUrl, ogLocale } from './urls';

/**
 * One builder for every route's metadata.
 *
 * The order is always: what the editor typed into the SEO group, then the
 * page's own title, then the Site global's defaults. A page is never left
 * without a title or a description, which is what the tests assert.
 */

export type SeoGroup = {
  metaTitle?: string | null;
  metaDescription?: string | null;
} | null;

export type PageSeoInput = {
  locale: Locale;
  /** Path without the locale prefix, e.g. `/impact`. */
  path: string;
  /** The page's own heading, used when the SEO group is empty. */
  title: string;
  description?: string | null;
  /** The SEO group of the document this page renders, if it has one. */
  seo?: SeoGroup;
  /** Extra meta tags, e.g. Google Scholar's citation_* on a paper. */
  other?: Metadata['other'];
  kind?: 'page' | 'paper' | 'figures';
};

// A field still holding the TBD marker — or a line of the demo seed, or an
// example.org address — counts as empty here, so none of it reaches a
// <title>, a share card or a search result.
const trim = publishable;

/**
 * A search result shows about 160 characters and a share card rather fewer,
 * so a description longer than that is cut — in the middle of a word, by
 * whoever is displaying it. An abstract pulled straight off a paper is often
 * longer, so it is cut here instead, at a word, with an ellipsis that says a
 * sentence was interrupted.
 */
const MAX_DESCRIPTION = 158;

function clamp(text: string): string {
  if (text.length <= MAX_DESCRIPTION) return text;
  const cut = text.slice(0, MAX_DESCRIPTION - 1);
  const lastSpace = cut.lastIndexOf(' ');
  return `${(lastSpace > MAX_DESCRIPTION / 2 ? cut.slice(0, lastSpace) : cut).replace(/[\s,.;:—-]+$/, '')}…`;
}

export async function buildPageMetadata(input: PageSeoInput): Promise<Metadata> {
  const site = await getSite(input.locale);

  const title = trim(input.seo?.metaTitle) ?? input.title;
  const description = clamp(
    trim(input.seo?.metaDescription) ??
      trim(input.description) ??
      trim(site.seo?.metaDescription) ??
      trim(site.missionLine) ??
      title,
  );

  const canonical = absoluteUrl(input.locale, input.path);
  const image = ogImageUrl({
    locale: input.locale,
    title,
    subtitle: site.organization?.legalName ?? null,
    kind: input.kind,
  });

  return {
    metadataBase: new URL(siteUrl),
    // The front page is the site: letting the template append the site name
    // to it would publish "Ажилчин Зөгий | Ажилчин Зөгий". `absolute` keeps
    // the one descriptive line the search result should carry.
    title: input.path === '/' ? { absolute: title } : title,
    description,
    alternates: {
      canonical,
      languages: languageAlternates(input.path),
    },
    openGraph: {
      type: 'website',
      url: canonical,
      title,
      description,
      locale: ogLocale[input.locale],
      alternateLocale: input.locale === 'mn' ? ogLocale.en : ogLocale.mn,
      images: [{ url: image, width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [image],
    },
    ...(input.other ? { other: input.other } : {}),
  };
}

/**
 * The root metadata for a locale: the title template every page inherits, and
 * the Search Console verification tag.
 */
export async function buildRootMetadata(
  locale: Locale,
  siteName: string,
  tagline: string,
): Promise<Metadata> {
  const site = await getSite(locale);
  const description = clamp(
    trim(site.seo?.metaDescription) ?? trim(site.missionLine) ?? tagline,
  );
  const verification = trim(process.env.NEXT_PUBLIC_GSC_VERIFICATION);

  return {
    metadataBase: new URL(siteUrl),
    title: {
      default: `${siteName} — ${tagline}`,
      template: `%s | ${siteName}`,
    },
    description,
    applicationName: siteName,
    manifest: '/manifest.webmanifest',
    icons: {
      icon: [
        { url: '/icon-light.png', media: '(prefers-color-scheme: light)' },
        { url: '/icon-dark.png', media: '(prefers-color-scheme: dark)' },
      ],
      apple: '/logo.png',
    },
    alternates: { languages: languageAlternates('/') },
    openGraph: {
      type: 'website',
      siteName,
      locale: ogLocale[locale],
      url: absoluteUrl(locale, '/'),
    },
    /*
     * Off until the content is the client's own; see src/lib/indexing.ts.
     *
     * When it is open, this says nothing about indexing at all — a crawler
     * that finds no robots tag indexes and follows, which is what we want.
     * Saying it out loud here would put `index, follow` on the 404 page too,
     * next to the `noindex` that not-found.tsx renders for itself: two
     * robots tags contradicting each other on the one page that most needs
     * to be read correctly. Only the image-preview hint is worth a tag, and
     * it goes to Googlebot alone.
     */
    robots: indexingAllowed
      ? { googleBot: { 'max-image-preview': 'large' } }
      : { index: false, follow: false, nocache: true },
    ...(verification ? { verification: { google: verification } } : {}),
  };
}

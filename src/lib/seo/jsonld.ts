import type {
  BreadcrumbList,
  Dataset,
  NGO,
  Person,
  ScholarlyArticle,
  WebSite,
  WithContext,
} from 'schema-dts';
import type { Locale } from '@/i18n/routing';
import type { Methodology, Paper, Site, Team } from '@/payload-types';
import type { ImpactMonthlyPoint, LocalizedMetric } from '@/lib/impact';
import { filledIn } from '@/lib/placeholder';
import { absoluteUrl } from './urls';
import { siteUrl } from '@/lib/site';

/**
 * Structured data, typed against schema.org through `schema-dts`, so a
 * misspelled property is a compile error rather than something a crawler
 * quietly ignores.
 *
 * Two rules carry over from the rest of the site: every URL is built from
 * NEXT_PUBLIC_SITE_URL, and nothing is invented — a field the CMS has not
 * filled in is left out rather than guessed at.
 */

/** Stable @id values, so the graph can point at itself. */
export const ngoId = `${siteUrl}/#organisation`;
export const websiteId = `${siteUrl}/#website`;

// Structured data never carries a placeholder: "TBD" published as the
// organisation's name is worse than the property being absent.
const clean = filledIn;

const dateOnly = (value?: string | null): string | undefined => {
  const text = clean(value);
  if (!text) return undefined;
  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString().slice(0, 10);
};

/** The organisation itself: an NGO, which is a subtype of Organization. */
export function ngoJsonLd(site: Site, locale: Locale): WithContext<NGO> {
  const sameAs = (site.socialLinks ?? [])
    .map((link) => clean(link.url))
    .filter((url): url is string => Boolean(url));

  const city = clean(site.organization?.addressCity);

  return {
    '@context': 'https://schema.org',
    '@type': 'NGO',
    '@id': ngoId,
    name: clean(site.organization?.legalName) ?? 'Ажилчин Зөгий',
    // Both languages, so a crawler reading either one finds the organisation.
    alternateName: locale === 'mn' ? 'Ajilchin Zögii' : 'Ажилчин Зөгий',
    url: absoluteUrl(locale, '/'),
    ...(clean(site.missionLine) ? { description: site.missionLine as string } : {}),
    ...(clean(site.contactEmail) ? { email: site.contactEmail as string } : {}),
    ...(dateOnly(site.organization?.foundingDate)
      ? { foundingDate: dateOnly(site.organization?.foundingDate) }
      : {}),
    ...(city ? { address: { '@type': 'PostalAddress', addressLocality: city } } : {}),
    ...(sameAs.length > 0 ? { sameAs } : {}),
    // A real, fetchable file in public/ — a logo URL that 404s is an error in
    // Google's Rich Results Test, not a warning.
    logo: `${siteUrl}/logo.png`,
  };
}

export function webSiteJsonLd(site: Site, locale: Locale): WithContext<WebSite> {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': websiteId,
    url: absoluteUrl(locale, '/'),
    name: clean(site.organization?.legalName) ?? 'Ажилчин Зөгий',
    inLanguage: locale,
    publisher: { '@id': ngoId },
  };
}

/** A named adult on the about page. Minors are never described here. */
export function personJsonLd(member: Team, locale: Locale): WithContext<Person> {
  const photo =
    typeof member.photo === 'object' && member.photo?.url ? member.photo.url : null;

  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: member.name,
    ...(clean(member.role) ? { jobTitle: member.role as string } : {}),
    ...(photo ? { image: photo.startsWith('http') ? photo : `${siteUrl}${photo}` } : {}),
    worksFor: { '@id': ngoId },
    url: absoluteUrl(locale, '/about'),
  };
}

export function scholarlyArticleJsonLd(
  paper: Paper,
  locale: Locale,
  abstract?: string | null,
): WithContext<ScholarlyArticle> {
  const pdf = typeof paper.pdf === 'object' && paper.pdf?.url ? paper.pdf.url : null;
  const pdfUrl = pdf ? (pdf.startsWith('http') ? pdf : `${siteUrl}${pdf}`) : null;
  const authors = (paper.authors ?? [])
    .map((author) => clean(author.name))
    .filter((name): name is string => Boolean(name));

  return {
    '@context': 'https://schema.org',
    '@type': 'ScholarlyArticle',
    headline: paper.title,
    name: paper.title,
    url: absoluteUrl(locale, `/research/${paper.slug}`),
    inLanguage: locale,
    ...(authors.length > 0
      ? { author: authors.map((name) => ({ '@type': 'Person' as const, name })) }
      : {}),
    ...(paper.year ? { datePublished: String(paper.year) } : {}),
    ...(clean(abstract) ? { abstract: abstract as string } : {}),
    // schema.org's `publication` is an event; a journal name belongs in
    // `isPartOf` as the periodical the article appeared in.
    ...(clean(paper.venue)
      ? { isPartOf: { '@type': 'Periodical' as const, name: paper.venue as string } }
      : {}),
    ...(clean(paper.doi) ? { identifier: paper.doi as string } : {}),
    ...(pdfUrl
      ? {
          encoding: {
            '@type': 'MediaObject',
            contentUrl: pdfUrl,
            encodingFormat: 'application/pdf',
          },
        }
      : {}),
    publisher: { '@id': ngoId },
  };
}

/**
 * The figures as a dataset: what they cover, when they were last fetched, and
 * which sources they rest on.
 */
export function datasetJsonLd(args: {
  locale: Locale;
  name: string;
  description: string;
  metrics: LocalizedMetric[];
  monthly: ImpactMonthlyPoint[];
  fetchedAt: string | null;
  methodology: Methodology | null;
}): WithContext<Dataset> {
  const months = args.monthly.map((point) => point.month).sort();
  const asOf = args.metrics
    .map((metric) => metric.asOf)
    .filter(Boolean)
    .sort();

  // "2026-01/2026-09" — the span the published figures actually cover.
  const temporalCoverage =
    months.length > 0
      ? `${months[0]}/${months.at(-1)}`
      : asOf.length > 0
        ? `${asOf[0]}/${asOf.at(-1)}`
        : undefined;

  const isBasedOn = (args.methodology?.sources ?? [])
    .map((source) => {
      const url = clean(source.url);
      const title = clean(source.title);
      if (!title) return null;
      return url
        ? { '@type': 'CreativeWork' as const, name: title, url }
        : { '@type': 'CreativeWork' as const, name: title };
    })
    .filter((source): source is { '@type': 'CreativeWork'; name: string; url?: string } =>
      Boolean(source),
    );

  return {
    '@context': 'https://schema.org',
    '@type': 'Dataset',
    name: args.name,
    description: args.description,
    url: absoluteUrl(args.locale, '/impact'),
    inLanguage: args.locale,
    creator: { '@id': ngoId },
    isAccessibleForFree: true,
    ...(temporalCoverage ? { temporalCoverage } : {}),
    ...(args.fetchedAt ? { dateModified: args.fetchedAt } : {}),
    ...(isBasedOn.length > 0 ? { isBasedOn } : {}),
    // The counting rules each figure was produced under.
    measurementTechnique: absoluteUrl(args.locale, '/methodology'),
  };
}

export type Crumb = { name: string; path: string };

export function breadcrumbJsonLd(
  crumbs: Crumb[],
  locale: Locale,
): WithContext<BreadcrumbList> {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((crumb, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: crumb.name,
      item: absoluteUrl(locale, crumb.path),
    })),
  };
}

/**
 * Google Scholar does not read JSON-LD; it reads these meta tags. A paper
 * without a PDF simply omits the pdf tag.
 */
export function scholarMetaTags(paper: Paper): Record<string, string | string[]> {
  const pdf = typeof paper.pdf === 'object' && paper.pdf?.url ? paper.pdf.url : null;
  const authors = (paper.authors ?? [])
    .map((author) => clean(author.name))
    .filter((name): name is string => Boolean(name));

  const tags: Record<string, string | string[]> = { citation_title: paper.title };
  if (authors.length > 0) tags.citation_author = authors;
  if (paper.year) tags.citation_publication_date = String(paper.year);
  if (clean(paper.venue)) tags.citation_journal_title = paper.venue as string;
  if (clean(paper.doi)) tags.citation_doi = paper.doi as string;
  if (pdf) tags.citation_pdf_url = pdf.startsWith('http') ? pdf : `${siteUrl}${pdf}`;
  return tags;
}

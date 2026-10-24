// @vitest-environment node
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  breadcrumbJsonLd,
  datasetJsonLd,
  ngoJsonLd,
  personJsonLd,
  scholarMetaTags,
  scholarlyArticleJsonLd,
  webSiteJsonLd,
} from '../../src/lib/seo/jsonld';
import type { Methodology, Paper, Site, Team } from '../../src/payload-types';

/** Round-trips through JSON, which is how a crawler actually reads it. */
const parsed = (value: unknown) => JSON.parse(JSON.stringify(value));

const site = {
  id: 1,
  missionLine: 'Хөдөлмөр эрхэлж байгаа хүүхдийн эрхийг хамгаална.',
  contactEmail: 'info@example.org',
  socialLinks: [{ id: 'a', platform: 'Facebook', url: 'https://facebook.com/example' }],
  organization: {
    legalName: 'Ажилчин Зөгий ТББ',
    foundingDate: '2021-04-15T00:00:00.000Z',
    addressCity: 'Улаанбаатар',
  },
  updatedAt: '2026-10-01T00:00:00.000Z',
  createdAt: '2026-10-01T00:00:00.000Z',
} as unknown as Site;

const paper = {
  id: 1,
  title: 'Хөдөлмөр эрхэлж байгаа хүүхдийн хамтын хэлэлцээр',
  slug: 'collective-bargaining',
  year: 2026,
  venue: 'Journal of Labour Studies',
  doi: '10.1234/abc.2026',
  status: 'published',
  authors: [
    { id: 'a', name: 'Б. Болормаа' },
    { id: 'b', name: 'D. Smith' },
  ],
  pdf: { id: 2, url: '/api/media/file/9f2a71c4.pdf', filename: '9f2a71c4.pdf' },
  updatedAt: '2026-10-01T00:00:00.000Z',
  createdAt: '2026-10-01T00:00:00.000Z',
} as unknown as Paper;

describe('the organisation', () => {
  const ngo = parsed(ngoJsonLd(site, 'mn'));

  it('is an NGO with a stable id and both names', () => {
    expect(ngo['@context']).toBe('https://schema.org');
    expect(ngo['@type']).toBe('NGO');
    expect(ngo['@id']).toMatch(/#organisation$/);
    expect(ngo.name).toBe('Ажилчин Зөгий ТББ');
    expect(ngo.alternateName).toBe('Ajilchin Zögii');
  });

  it('carries the contact details the Site global holds', () => {
    expect(ngo.email).toBe('info@example.org');
    expect(ngo.foundingDate).toBe('2021-04-15');
    expect(ngo.address).toEqual({
      '@type': 'PostalAddress',
      addressLocality: 'Улаанбаатар',
    });
    expect(ngo.sameAs).toEqual(['https://facebook.com/example']);
  });

  it('builds every URL from the configured site URL', () => {
    const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
    expect(ngo.url.startsWith(base)).toBe(true);
    expect(JSON.stringify(ngo)).not.toContain('ajilchinzugii.mn');
  });

  it('leaves out what the CMS has not filled in, rather than guessing', () => {
    const bare = parsed(ngoJsonLd({ id: 1 } as unknown as Site, 'en'));
    expect(bare.email).toBeUndefined();
    expect(bare.foundingDate).toBeUndefined();
    expect(bare.address).toBeUndefined();
    expect(bare.sameAs).toBeUndefined();
    expect(bare.name).toBeTruthy();
  });

  it('points its logo at a file that actually exists', () => {
    // A logo URL that 404s is an error in Google's Rich Results Test, and the
    // site had no public/ directory at all when this was first written.
    const path = new URL(ngo.logo).pathname;
    expect(existsSync(resolve(process.cwd(), 'public', path.slice(1)))).toBe(true);
  });

  it('points the website at the same organisation', () => {
    const web = parsed(webSiteJsonLd(site, 'en'));
    expect(web['@type']).toBe('WebSite');
    expect(web.publisher['@id']).toBe(ngo['@id']);
    expect(web.inLanguage).toBe('en');
  });
});

describe('a person on the about page', () => {
  const member = {
    id: 1,
    name: 'Б. Болормаа',
    role: 'Үүсгэн байгуулагч',
    confirmedAdult18Plus: true,
    updatedAt: '',
    createdAt: '',
  } as unknown as Team;

  it('works for the organisation by reference', () => {
    const person = parsed(personJsonLd(member, 'mn'));
    expect(person['@type']).toBe('Person');
    expect(person.name).toBe('Б. Болормаа');
    expect(person.jobTitle).toBe('Үүсгэн байгуулагч');
    expect(person.worksFor['@id']).toMatch(/#organisation$/);
  });
});

describe('a paper', () => {
  const article = parsed(scholarlyArticleJsonLd(paper, 'mn', 'Хураангуй текст.'));

  it('is a ScholarlyArticle with its authors, date and abstract', () => {
    expect(article['@type']).toBe('ScholarlyArticle');
    expect(article.author).toEqual([
      { '@type': 'Person', name: 'Б. Болормаа' },
      { '@type': 'Person', name: 'D. Smith' },
    ]);
    expect(article.datePublished).toBe('2026');
    expect(article.abstract).toBe('Хураангуй текст.');
    expect(article.url).toMatch(/\/mn\/research\/collective-bargaining$/);
  });

  it('describes the PDF as an encoding, with an absolute URL', () => {
    expect(article.encoding).toMatchObject({
      '@type': 'MediaObject',
      encodingFormat: 'application/pdf',
    });
    expect(article.encoding.contentUrl).toMatch(
      /^https?:\/\/.+\/api\/media\/file\/.+\.pdf$/,
    );
  });

  it('names the journal as a periodical, not as an event', () => {
    // schema.org's `publication` expects a PublicationEvent; a journal name
    // belongs in isPartOf.
    expect(article.isPartOf).toEqual({
      '@type': 'Periodical',
      name: 'Journal of Labour Studies',
    });
    expect(article.publication).toBeUndefined();
  });

  it('gives Google Scholar the meta tags it reads', () => {
    const tags = scholarMetaTags(paper);
    expect(tags.citation_title).toBe(paper.title);
    expect(tags.citation_author).toEqual(['Б. Болормаа', 'D. Smith']);
    expect(tags.citation_publication_date).toBe('2026');
    expect(String(tags.citation_pdf_url)).toMatch(/\.pdf$/);
  });

  it('omits the pdf tag when there is no pdf', () => {
    const tags = scholarMetaTags({ ...paper, pdf: null } as unknown as Paper);
    expect(tags.citation_pdf_url).toBeUndefined();
    expect(tags.citation_title).toBeTruthy();
  });
});

describe('the figures as a dataset', () => {
  const methodology = {
    id: 1,
    sources: [
      { id: 'a', title: 'Child Labour Survey 2021–22', url: 'https://example.org/cls' },
      { id: 'b', title: "The organisation's own case log" },
    ],
    updatedAt: '',
    createdAt: '',
  } as unknown as Methodology;

  const dataset = parsed(
    datasetJsonLd({
      locale: 'en',
      name: 'Impact',
      description: 'Measured results.',
      metrics: [
        {
          metricId: 'cases',
          label: 'Cases',
          value: 42,
          suppressed: false,
          nCases: 42,
          asOf: '2026-09-30',
          methodAnchor: 'counting-cases',
          methodHref: '/en/methodology#counting-cases',
          showOnHome: true,
        },
      ],
      monthly: [
        { month: '2026-01', metricId: 'cases', value: 4, suppressed: false, nCases: 6 },
        {
          month: '2026-09',
          metricId: 'cases',
          value: null,
          suppressed: true,
          nCases: null,
        },
      ],
      fetchedAt: '2026-10-24T06:00:00.000Z',
      methodology,
    }),
  );

  it('covers the span the published months actually run over', () => {
    expect(dataset['@type']).toBe('Dataset');
    expect(dataset.temporalCoverage).toBe('2026-01/2026-09');
  });

  it('records when the figures were last fetched', () => {
    expect(dataset.dateModified).toBe('2026-10-24T06:00:00.000Z');
  });

  it('credits the sources, with a link where the CMS has one', () => {
    expect(dataset.isBasedOn).toEqual([
      {
        '@type': 'CreativeWork',
        name: 'Child Labour Survey 2021–22',
        url: 'https://example.org/cls',
      },
      { '@type': 'CreativeWork', name: "The organisation's own case log" },
    ]);
  });

  it('never carries a suppressed value into the structured data', () => {
    expect(JSON.stringify(dataset)).not.toContain('"value"');
  });

  it('holds together with no sources at all', () => {
    const bare = parsed(
      datasetJsonLd({
        locale: 'mn',
        name: 'Нөлөөлөл',
        description: 'Тайлбар',
        metrics: [],
        monthly: [],
        fetchedAt: null,
        methodology: null,
      }),
    );
    expect(bare.isBasedOn).toBeUndefined();
    expect(bare.temporalCoverage).toBeUndefined();
    expect(bare.dateModified).toBeUndefined();
    expect(bare.name).toBe('Нөлөөлөл');
  });
});

describe('breadcrumbs', () => {
  it('number the trail from one and link each step', () => {
    const crumbs = parsed(
      breadcrumbJsonLd(
        [
          { name: 'Нүүр', path: '/' },
          { name: 'Нөлөөлөл', path: '/impact' },
        ],
        'mn',
      ),
    );

    expect(crumbs['@type']).toBe('BreadcrumbList');
    expect(crumbs.itemListElement).toHaveLength(2);
    expect(crumbs.itemListElement[0].position).toBe(1);
    expect(crumbs.itemListElement[1].item).toMatch(/\/mn\/impact$/);
  });
});

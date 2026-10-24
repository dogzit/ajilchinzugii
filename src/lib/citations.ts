/**
 * APA and BibTeX strings for a paper.
 *
 * Author names are used exactly as the editor typed them. Mongolian names are
 * not "Lastname, F. M." — initialising them would produce wrong citations — so
 * the editor enters each name in the form it should be cited in and we never
 * reorder or abbreviate it.
 */

export type PaperStatus = 'working-paper' | 'preprint' | 'under-review' | 'published';

export type CitationInput = {
  title?: string | null;
  authors?: ({ name?: string | null } | null)[] | null;
  year?: number | null;
  venue?: string | null;
  doi?: string | null;
  slug?: string | null;
  status?: PaperStatus | null;
};

const MISSING = '[ХҮЛЭЭГДЭЖ БУЙ / TBD]';

export function authorNames(input: CitationInput): string[] {
  return (input.authors ?? [])
    .map((author) => author?.name?.trim())
    .filter((name): name is string => Boolean(name));
}

/** "A", "A & B", "A, B, & C" — APA 7 joining, names left as written. */
export function formatApaAuthors(names: string[]): string {
  if (names.length === 0) return MISSING;
  if (names.length === 1) return names[0] as string;
  if (names.length === 2) return `${names[0]} & ${names[1]}`;
  return `${names.slice(0, -1).join(', ')}, & ${names.at(-1)}`;
}

/** DOIs are stored bare ("10.1234/abc") or as a URL; always cited as a URL. */
export function doiUrl(doi?: string | null): string | null {
  const value = doi?.trim();
  if (!value) return null;
  if (/^https?:\/\//i.test(value)) return value;
  return `https://doi.org/${value.replace(/^doi:\s*/i, '')}`;
}

function sentence(value?: string | null): string {
  const text = value?.trim();
  if (!text) return MISSING;
  return /[.?!]$/.test(text) ? text : `${text}.`;
}

export function buildApa(input: CitationInput): string {
  const parts = [
    `${formatApaAuthors(authorNames(input))} (${input.year ?? 'n.d.'}).`,
    sentence(input.title),
  ];

  const venue = input.venue?.trim();
  if (venue) {
    parts.push(sentence(venue));
  } else if (input.status && input.status !== 'published') {
    parts.push(`${statusLabel(input.status)}.`);
  }

  const url = doiUrl(input.doi);
  if (url) parts.push(url);

  return parts.join(' ');
}

export function statusLabel(status: PaperStatus): string {
  switch (status) {
    case 'working-paper':
      return 'Working paper';
    case 'preprint':
      return 'Preprint';
    case 'under-review':
      return 'Manuscript under review';
    case 'published':
      return 'Published';
  }
}

/** BibTeX reserves these characters; a bare & or % breaks the entry. */
export function escapeBibtex(value: string): string {
  return value
    .replace(/\\/g, '\\textbackslash{}')
    .replace(/([&%$#_{}])/g, '\\$1')
    .replace(/~/g, '\\textasciitilde{}')
    .replace(/\^/g, '\\textasciicircum{}');
}

function bibtexType(input: CitationInput): string {
  if (input.status === 'published' && input.venue?.trim()) return 'article';
  if (input.status === 'working-paper') return 'techreport';
  return 'unpublished';
}

export function bibtexKey(input: CitationInput): string {
  const slug = input.slug?.trim();
  if (slug) return `${slug}${input.year ? `-${input.year}` : ''}`;
  const first = authorNames(input)[0]?.split(/\s+/).at(-1)?.toLowerCase();
  return [first ?? 'paper', input.year ?? 'nd'].join('-').replace(/[^a-z0-9-]/g, '');
}

export function buildBibtex(input: CitationInput): string {
  const names = authorNames(input);
  const fields: [string, string][] = [
    ['author', names.length ? names.map(escapeBibtex).join(' and ') : MISSING],
    // Double braces keep the title's capitalisation exactly as entered.
    ['title', `{${escapeBibtex(input.title?.trim() ?? MISSING)}}`],
    ['year', String(input.year ?? '')],
  ];

  const venue = input.venue?.trim();
  if (venue) {
    fields.push([
      bibtexType(input) === 'article' ? 'journal' : 'institution',
      escapeBibtex(venue),
    ]);
  }
  if (input.status && input.status !== 'published') {
    fields.push(['note', escapeBibtex(statusLabel(input.status))]);
  }
  const doi = input.doi?.trim();
  if (doi)
    fields.push(['doi', escapeBibtex(doi.replace(/^https?:\/\/(dx\.)?doi\.org\//i, ''))]);
  const url = doiUrl(input.doi);
  if (url) fields.push(['url', url]);

  const body = fields
    .filter(([, value]) => value !== '')
    .map(([key, value]) => `  ${key} = {${value}}`)
    .join(',\n');

  return `@${bibtexType(input)}{${bibtexKey(input)},\n${body}\n}`;
}

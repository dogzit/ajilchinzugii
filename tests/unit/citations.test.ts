import { describe, expect, it } from 'vitest';
import {
  buildApa,
  buildBibtex,
  doiUrl,
  escapeBibtex,
  formatApaAuthors,
} from '../../src/lib/citations';

const paper = {
  title: 'Хөдөлмөр эрхэлж байгаа хүүхдийн хамтын хэлэлцээр',
  authors: [{ name: 'Б. Болормаа' }, { name: 'D. Smith' }],
  year: 2026,
  venue: 'Journal of Labour Studies',
  doi: '10.1234/abc.2026',
  slug: 'collective-bargaining',
  status: 'published' as const,
};

describe('APA', () => {
  it('joins authors the APA way without touching the names', () => {
    expect(formatApaAuthors(['A'])).toBe('A');
    expect(formatApaAuthors(['A', 'B'])).toBe('A & B');
    expect(formatApaAuthors(['A', 'B', 'C'])).toBe('A, B, & C');
  });

  it('keeps Mongolian names exactly as entered', () => {
    expect(buildApa(paper)).toContain('Б. Болормаа & D. Smith');
  });

  it('builds a full reference', () => {
    expect(buildApa(paper)).toBe(
      'Б. Болормаа & D. Smith (2026). Хөдөлмөр эрхэлж байгаа хүүхдийн хамтын хэлэлцээр. ' +
        'Journal of Labour Studies. https://doi.org/10.1234/abc.2026',
    );
  });

  it('marks missing parts instead of inventing them', () => {
    const apa = buildApa({
      title: null,
      authors: [],
      year: null,
      status: 'working-paper',
    });
    expect(apa).toContain('[ХҮЛЭЭГДЭЖ БУЙ / TBD]');
    expect(apa).toContain('(n.d.)');
    expect(apa).toContain('Working paper');
  });

  it('normalises DOIs', () => {
    expect(doiUrl('10.1/x')).toBe('https://doi.org/10.1/x');
    expect(doiUrl('doi: 10.1/x')).toBe('https://doi.org/10.1/x');
    expect(doiUrl('https://doi.org/10.1/x')).toBe('https://doi.org/10.1/x');
    expect(doiUrl('  ')).toBeNull();
  });
});

describe('BibTeX', () => {
  it('escapes reserved characters', () => {
    expect(escapeBibtex('Rights & duties 50% of _cases_')).toBe(
      'Rights \\& duties 50\\% of \\_cases\\_',
    );
  });

  it('uses @article for a published paper with a venue', () => {
    const bib = buildBibtex(paper);
    expect(bib.startsWith('@article{collective-bargaining-2026,')).toBe(true);
    expect(bib).toContain('author = {Б. Болормаа and D. Smith}');
    expect(bib).toContain('journal = {Journal of Labour Studies}');
    expect(bib).toContain('doi = {10.1234/abc.2026}');
    expect(bib).toContain('url = {https://doi.org/10.1234/abc.2026}');
    expect(bib.endsWith('\n}')).toBe(true);
  });

  it('protects the title capitalisation with braces', () => {
    expect(buildBibtex(paper)).toContain(
      'title = {{Хөдөлмөр эрхэлж байгаа хүүхдийн хамтын хэлэлцээр}}',
    );
  });

  it('falls back to @unpublished and notes the status', () => {
    const bib = buildBibtex({ ...paper, status: 'under-review', venue: null, doi: null });
    expect(bib.startsWith('@unpublished{')).toBe(true);
    expect(bib).toContain('note = {Manuscript under review}');
    expect(bib).not.toContain('doi =');
  });

  it('strips a doi.org prefix before storing the doi field', () => {
    expect(buildBibtex({ ...paper, doi: 'https://doi.org/10.5/y' })).toContain(
      'doi = {10.5/y}',
    );
  });
});

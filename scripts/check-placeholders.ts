import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { getPayload } from 'payload';
import config from '../src/payload.config';
import { isDemoValue, isPlaceholder } from '../src/lib/placeholder';

/**
 * Is this site ready to be read by anyone who is not an editor?
 *
 * Run it: pnpm check:placeholders
 *
 * It looks in the two places a stand-in can hide — the repository, and the
 * database the pages are actually built from — and lists what it finds, with
 * the page an editor would open to fix it.
 *
 * It only fails the build when NEXT_PUBLIC_ALLOW_INDEXING is true, which is
 * the moment the site stops being a private draft: a search engine that
 * learns "ЖИШЭЭ: ..." as the organisation's name and info@example.org as its
 * address keeps that reading long after the real text arrives. Until then it
 * reports and gets out of the way, because a site full of placeholders is
 * exactly what this project is meant to look like before handover.
 */

type Finding = { where: string; what: string; line?: number };

// ── the repository ──────────────────────────────────────────────────────────

const MARKERS: { pattern: RegExp; what: string }[] = [
  { pattern: /ЖИШЭЭ/, what: 'ЖИШЭЭ' },
  { pattern: /\bSAMPLE\b/, what: 'SAMPLE' },
  { pattern: /ОРЛУУЛАГЧ/, what: 'ОРЛУУЛАГЧ' },
  // Upper case only: the marker an editor sees is "[PLACEHOLDER: ...]", and
  // matching loosely would catch every import of lib/placeholder.
  { pattern: /\bPLACEHOLDER\b/, what: 'PLACEHOLDER' },
  { pattern: /ХҮЛЭЭГДЭЖ БУЙ|\bTBD\b/, what: 'TBD' },
  { pattern: /\bexample\.(org|com|net)\b/i, what: 'example.org' },
  { pattern: /\bPartner [AB]\b/, what: 'Partner A/B' },
];

/**
 * Files whose whole job is to hold a placeholder.
 *
 * The demo seeder fills the site with a walkthrough; the first-run seeder
 * writes the TBD marker into every empty field on purpose; the rest define
 * the markers, or the label a page shows in place of a field the CMS has not
 * been given yet. None of them is content waiting to be replaced.
 */
const EXEMPT_FILES = [
  'src/payload/seed-demo.ts',
  'src/payload/seed.ts',
  // Same case as seed.ts: it seeds the TBD marker into the SEO fields it has
  // no copy for, so an editor can see which ones are still waiting. Whether
  // any of those markers actually reached the site is the content scan's
  // question, not this one's — and the content scan reads the database.
  'src/payload/seed-org.ts',
  'src/lib/placeholder.ts',
  'src/lib/citations.ts',
  'src/components/demo-banner.tsx',
];

/** The same thing in the catalogues: a label that says "not filled in yet". */
const EXEMPT_MESSAGES = [
  'footer.contactEmailMissing',
  'placeholder.tbd',
  // The strip that announces the demo content; it goes when the content does.
  'demo.tag',
  'demo.banner',
  'demo.bannerEn',
];

const SOURCE = 'src';
const CATALOGUES = 'messages';

function* files(dir: string, extensions: string[]): Generator<string> {
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry.startsWith('.')) continue;
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) yield* files(path, extensions);
    else if (extensions.some((extension) => entry.endsWith(extension))) yield path;
  }
}

/**
 * Comments are not content. Nearly every marker in the source is in a comment
 * explaining why markers must not be published, and reporting those every
 * time would bury the one line that is a real stand-in.
 */
function withoutComments(code: string): string {
  return code
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .filter((line) => !/^\s*(\/\/|\*)/.test(line))
    .join('\n');
}

function markersIn(text: string): string[] {
  return MARKERS.filter(({ pattern }) => pattern.test(text)).map(({ what }) => what);
}

function scanSource(): Finding[] {
  const findings: Finding[] = [];

  for (const path of files(SOURCE, ['.ts', '.tsx'])) {
    const where = relative(process.cwd(), path);
    if (EXEMPT_FILES.includes(where) || where.endsWith('.d.ts')) continue;

    withoutComments(readFileSync(path, 'utf8'))
      .split('\n')
      .forEach((text, index) => {
        for (const what of markersIn(text)) {
          findings.push({ where, what, line: index + 1 });
        }
      });
  }

  return findings;
}

/** Every string in the catalogues, by the key an editor would look up. */
function* entries(value: unknown, path: string[] = []): Generator<[string, string]> {
  if (typeof value === 'string') yield [path.join('.'), value];
  else if (value && typeof value === 'object') {
    for (const [key, item] of Object.entries(value)) yield* entries(item, [...path, key]);
  }
}

function scanCatalogues(): Finding[] {
  const findings: Finding[] = [];

  for (const path of files(CATALOGUES, ['.json'])) {
    const where = relative(process.cwd(), path);
    const catalogue: unknown = JSON.parse(readFileSync(path, 'utf8'));

    for (const [key, text] of entries(catalogue)) {
      if (EXEMPT_MESSAGES.includes(key)) continue;
      for (const what of markersIn(text))
        findings.push({ where: `${where} → ${key}`, what });
    }
  }

  return findings;
}

// ── the database the pages are built from ───────────────────────────────────

/** Every string in a document, with the path that leads to it. */
function* strings(value: unknown, path: string[] = []): Generator<[string, string]> {
  if (typeof value === 'string') {
    yield [path.join('.'), value];
  } else if (Array.isArray(value)) {
    for (const [index, item] of value.entries())
      yield* strings(item, [...path, `${index}`]);
  } else if (value && typeof value === 'object') {
    for (const [key, item] of Object.entries(value)) {
      // Payload's own bookkeeping, not anything an editor wrote.
      if (['id', 'updatedAt', 'createdAt', 'filename', 'url', 'type'].includes(key)) {
        continue;
      }
      yield* strings(item, [...path, key]);
    }
  }
}

async function scanContent(): Promise<Finding[]> {
  const payload = await getPayload({ config });
  const findings: Finding[] = [];

  const look = (where: string, document: unknown) => {
    for (const [path, text] of strings(document)) {
      // An empty field is not a stand-in: it is a field nobody has reached
      // yet, and the page already leaves it out.
      if (!text.trim()) continue;

      if (isDemoValue(text)) findings.push({ where: `${where} → ${path}`, what: 'demo' });
      else if (isPlaceholder(text))
        findings.push({ where: `${where} → ${path}`, what: 'TBD' });
    }
  };

  for (const slug of ['site', 'methodology', 'policy'] as const) {
    look(`global: ${slug}`, await payload.findGlobal({ slug, locale: 'mn', depth: 0 }));
  }

  for (const slug of ['papers', 'partners', 'team'] as const) {
    const { docs } = await payload.find({
      collection: slug,
      locale: 'mn',
      depth: 0,
      limit: 200,
    });
    docs.forEach((doc, index) => look(`${slug}[${index}]`, doc));
  }

  return findings;
}

// ── the report ──────────────────────────────────────────────────────────────

function report(title: string, findings: Finding[]) {
  if (findings.length === 0) {
    console.log(`  ${title}: nothing to replace.`);
    return;
  }

  console.log(`  ${title}: ${findings.length}`);
  const seen = new Set<string>();
  for (const finding of findings) {
    const key = `${finding.where}:${finding.what}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const at = finding.line ? `:${finding.line}` : '';
    console.log(`    ${finding.where}${at}  (${finding.what})`);
  }
}

const gated = process.env.NEXT_PUBLIC_ALLOW_INDEXING?.trim() === 'true';

console.log('\nPlaceholder check\n');

const inRepository = [...scanSource(), ...scanCatalogues()];

let inContent: Finding[] = [];
try {
  inContent = await scanContent();
} catch (error) {
  // No database here — a lint-only CI job, say. The repository scan still
  // ran, and saying so is better than passing quietly.
  console.log('  content: could not be read');
  console.log(`    ${(error as Error).message.split('\n')[0]}`);
}

report('repository', inRepository);
report('content', inContent);

const total = inRepository.length + inContent.length;

if (total === 0) {
  console.log('\nNothing outstanding.\n');
  process.exit(0);
}

if (gated) {
  console.error(
    `\nNEXT_PUBLIC_ALLOW_INDEXING is true, so this site is about to be offered\n` +
      `to search engines, and ${total} placeholder${total === 1 ? '' : 's'} would go with it.\n` +
      `Replace them, or set the flag back to false.\n`,
  );
  process.exit(1);
}

console.log(
  `\n${total} to replace before launch. Indexing is still closed` +
    ` (NEXT_PUBLIC_ALLOW_INDEXING is not true), so this is a note, not a failure.\n`,
);
process.exit(0);

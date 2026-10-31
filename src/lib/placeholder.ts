/**
 * The marker the project uses for content that has not been written yet
 * (CLAUDE.md: "use clearly marked placeholders").
 *
 * It belongs on the page, where an editor and a reader can both see that
 * something is outstanding. It does not belong in a <title>, a share card or
 * structured data: there it would be published to search engines as if it
 * were the organisation's name. Those places treat it as empty and fall back.
 */
export const TBD_MARKER = '[ХҮЛЭЭГДЭЖ БУЙ / TBD]';

export function isPlaceholder(value?: string | null): boolean {
  const text = value?.trim();
  if (!text) return true;
  return text.includes('ХҮЛЭЭГДЭЖ БУЙ') || /\bTBD\b/.test(text);
}

/** The value, or undefined when it is blank or still a placeholder. */
export function filledIn(value?: string | null): string | undefined {
  return isPlaceholder(value) ? undefined : value?.trim();
}

/**
 * The markers the demo seed leaves behind.
 *
 * `pnpm seed:demo` fills the site with a walkthrough: every line is prefixed
 * ЖИШЭЭ / SAMPLE, partners are called Partner A and B, and every address is
 * example.org. On the page that is the point — the banner across the top says
 * so, and an editor can see what a filled-in site will look like.
 *
 * Published metadata is the one place it must not reach. A <title>, a share
 * card, a search result or a line of structured data is read away from the
 * page and away from the banner, so "ЖИШЭЭ: ..." there would be the
 * organisation's name as far as a crawler is concerned, and info@example.org
 * would be its contact address.
 */
const DEMO_PATTERNS = [
  /ЖИШЭЭ/,
  /\bSAMPLE\b/,
  /ОРЛУУЛАГЧ/i,
  /\bexample\.(org|com|net)\b/i,
  /\bPartner [AB]\b/,
  /\bLorem ipsum\b/i,
];

export function isDemoValue(value?: string | null): boolean {
  const text = value?.trim();
  if (!text) return false;
  return DEMO_PATTERNS.some((pattern) => pattern.test(text));
}

/**
 * The value, or undefined when it is blank, still a placeholder, or demo
 * content. This is what metadata and structured data read with: they would
 * rather say nothing than publish a stand-in.
 */
export function publishable(value?: string | null): string | undefined {
  const text = filledIn(value);
  return text && !isDemoValue(text) ? text : undefined;
}

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

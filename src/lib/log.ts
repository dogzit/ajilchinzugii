import { CONTRACT_PATHS } from './extraction/contract';

/**
 * The only logger the rater uses. It takes an event name and values that
 * cannot carry a person's words: numbers, booleans, and strings from a fixed
 * vocabulary — field paths, error codes, document kinds. Any other string is
 * dropped before it reaches the log, so contract or CV text, extracted
 * values, names and model payloads cannot end up there even by mistake
 * (spec, data item 10; tests/unit/no-leaks.test.ts).
 */

type Safe = number | boolean | string | string[];

const VOCABULARY = new Set<string>([
  ...CONTRACT_PATHS,
  'flagged_clauses',
  'job_category',
  'contract',
  'cv',
  'pdf',
  'docx',
  'text',
  'too_large',
  'too_many_pages',
  'unsupported_type',
  'unreadable',
  'no_text',
  'llm_unavailable',
  'invalid_output',
  'not_configured',
]);

/** Add words (e.g. the CV field paths) to the vocabulary. */
export function allowLogWords(words: readonly string[]): void {
  for (const word of words) VOCABULARY.add(word);
}

function clean(value: unknown): Safe | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') return VOCABULARY.has(value) ? value : undefined;
  if (Array.isArray(value)) return value.filter((v): v is string => typeof v === 'string' && VOCABULARY.has(v)).slice(0, 64);
  return undefined;
}

export function logEvent(event: 'corrected_fields' | 'extraction_failed' | 'extraction_dropped' | 'case_alert_failed' | 'case_purge', meta: Record<string, unknown> = {}): void {
  const safe: Record<string, Safe> = {};
  for (const [key, value] of Object.entries(meta)) {
    const v = clean(value);
    if (/^[a-z_]{1,32}$/.test(key) && v !== undefined) safe[key] = v;
  }
  console.info(`[rater] ${event} ${JSON.stringify(safe)}`);
}

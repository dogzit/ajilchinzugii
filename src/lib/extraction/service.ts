import { LlmUnavailable } from '../llm/anthropic';
import type { Extraction } from '../rater/fields';
import { CONTRACT_PATHS, CONTRACT_SYSTEM, contractWireSchema, getPath, setPath, wireToExtraction } from './contract';
import { excerptMatches } from './evidence';
import type { Extractor } from './extractor';
import { redact } from './redact';
import { ExtractionError, MAX_TEXT_CHARS } from './text';

/**
 * The shared extraction service (spec, "LLM and OCR"; ADR §8):
 *
 *   text → redact → extract (LLM, text only) → validate → evidence check
 *
 * The same steps serve the CV rater with its own schema. What comes back is
 * the redacted text (for the confirmation screen and an opted-in case file),
 * the fields, and the paths that were dropped because their excerpt was not
 * in the document. Nothing here logs a single character of the text.
 */

export type ExtractResult<T> = {
  /** The text after redaction: the only text the model saw. */
  text: string;
  fields: T;
  /** Fields the model filled whose excerpt did not match the text: now unknown. */
  dropped: string[];
  redactions: Record<string, number>;
};

/** Minimum readable text before the model is asked at all. */
const MIN_CHARS = 40;

export function prepare(raw: string): { text: string; redactions: Record<string, number> } {
  const trimmed = raw.replace(/\r\n?/g, '\n').trim();
  if (trimmed.length < MIN_CHARS) throw new ExtractionError('no_text');
  if (trimmed.length > MAX_TEXT_CHARS) throw new ExtractionError('too_many_pages');
  const { text, counts } = redact(trimmed);
  return { text, redactions: counts };
}

export async function callExtractor<T>(extractor: Extractor, run: (e: Extractor) => Promise<T>): Promise<T> {
  try {
    return await run(extractor);
  } catch (error) {
    if (error instanceof LlmUnavailable) throw new ExtractionError(error.reason === 'invalid' ? 'invalid_output' : 'llm_unavailable');
    throw new ExtractionError('invalid_output');
  }
}

/** The anti-hallucination check for a contract: every value needs its excerpt in the text. */
export function checkContractEvidence(extraction: Extraction, text: string): { fields: Extraction; dropped: string[] } {
  const fields = structuredClone(extraction);
  const dropped: string[] = [];
  for (const path of CONTRACT_PATHS) {
    const value = getPath(fields, path);
    const evidence = fields.evidence[path];
    if (value === null || value === undefined) {
      delete fields.evidence[path];
      continue;
    }
    if (!evidence || !excerptMatches(evidence.excerpt, text)) {
      setPath(fields, path, null);
      delete fields.evidence[path];
      dropped.push(path);
    }
  }
  // Evidence for a path the schema does not know is not evidence.
  for (const key of Object.keys(fields.evidence)) {
    if (!(CONTRACT_PATHS as readonly string[]).includes(key)) delete fields.evidence[key];
  }
  fields.job.tasks = fields.job.tasks.filter((task) => excerptMatches(task, text));
  const clauses = fields.flagged_clauses.filter((clause) => excerptMatches(clause.excerpt, text));
  if (clauses.length < fields.flagged_clauses.length) dropped.push('flagged_clauses');
  fields.flagged_clauses = clauses;
  return { fields, dropped };
}

export async function extractContract(raw: string, extractor: Extractor): Promise<ExtractResult<Extraction>> {
  const { text, redactions } = prepare(raw);
  const wire = await callExtractor(extractor, (e) =>
    e.extract({ name: 'contract', schema: contractWireSchema, system: CONTRACT_SYSTEM }, text),
  );
  let extraction: Extraction;
  try {
    extraction = wireToExtraction(wire);
  } catch {
    throw new ExtractionError('invalid_output');
  }
  const { fields, dropped } = checkContractEvidence(extraction, text);
  return { text, fields, dropped, redactions };
}

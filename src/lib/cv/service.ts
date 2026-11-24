import { callExtractor, prepare } from '../extraction/service';
import type { Extractor } from '../extraction/extractor';
import { ExtractionError } from '../extraction/text';
import { checkCvEvidence, CV_SYSTEM, cvWireSchema, type CvExtraction } from './extraction';
import { wordCount } from './engine';

/** The shared pipeline with the CV schema: text → redact → extract → validate → evidence check. */
export async function extractCv(
  raw: string,
  extractor: Extractor,
): Promise<{ text: string; cv: CvExtraction; dropped: string[]; redactions: Record<string, number>; wordCount: number }> {
  const { text, redactions } = prepare(raw);
  const wire = await callExtractor(extractor, (e) => e.extract({ name: 'cv', schema: cvWireSchema, system: CV_SYSTEM }, text));
  const parsed = cvWireSchema.safeParse(wire);
  if (!parsed.success) throw new ExtractionError('invalid_output');
  const { cv, dropped } = checkCvEvidence(parsed.data, text);
  return { text, cv, dropped, redactions, wordCount: wordCount(text) };
}

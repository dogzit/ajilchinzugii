import { z } from 'zod';
import { rate, rateWithReality, type Rating } from './engine';
import { contractFieldsSchema } from './fields';
import { ruleSet } from './rule-set';
import { todayInUlaanbaatar } from './http';

/**
 * What every rater endpoint receives: the confirmed fields and, after a
 * document, what actually happens at work. The server always rates again
 * from these — a verdict, a score or a priority is never taken from the
 * browser.
 */
/**
 * The job category is one of rules.yaml's ids or nothing: it is counted in
 * the anonymous statistics and stored with a case, so free text — a name, a
 * phone number — must never get that far (CLAUDE.md rule 12).
 */
const categoryIds = new Set(ruleSet.job_categories.map((c) => c.id));
const fieldsSchema = contractFieldsSchema.refine((f) => f.job_category === null || categoryIds.has(f.job_category), {
  path: ['job_category'],
});

export const ratingRequestSchema = z.object({
  fields: fieldsSchema,
  actual: fieldsSchema.optional(),
  /** Field paths the reader changed on the confirmation screen — names only, never values. */
  corrected: z.array(z.string().max(64)).max(64).optional(),
});

export type RatingRequest = z.infer<typeof ratingRequestSchema>;

export function rateRequest({ fields, actual }: RatingRequest, date = todayInUlaanbaatar()): Rating {
  // "Read from a document" with no evidence at all is a questionnaire in
  // disguise: the AI-checked greens only belong to a document that was read.
  if (fields.source === 'document' && !Object.keys(fields.evidence).length) fields = { ...fields, source: 'questionnaire' };
  return actual ? rateWithReality(fields, actual, date, ruleSet) : rate(fields, date, ruleSet);
}

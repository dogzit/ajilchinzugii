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
export const ratingRequestSchema = z.object({
  fields: contractFieldsSchema,
  actual: contractFieldsSchema.optional(),
  /** Field paths the reader changed on the confirmation screen — names only, never values. */
  corrected: z.array(z.string().max(64)).max(64).optional(),
});

export type RatingRequest = z.infer<typeof ratingRequestSchema>;

export function rateRequest({ fields, actual }: RatingRequest, date = todayInUlaanbaatar()): Rating {
  return actual ? rateWithReality(fields, actual, date, ruleSet) : rate(fields, date, ruleSet);
}

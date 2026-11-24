import { z } from 'zod';
import { isoDate } from './fields';
import raw from './rules.generated.json';

/**
 * The shape of rules.yaml. The app imports the compiled JSON (no YAML parser
 * and no file read at request time, on either runtime); it is validated here
 * once, when the module loads, so a broken rule set fails loudly in the first
 * test or build rather than quietly in front of a reader.
 */

const band = z.object({ min: z.number().int(), max: z.number().int() });
const priority = z.enum(['P1', 'P2', 'P3']);

export const appliesTo = z.enum(['minor', 'minor_15_17', 'adult', 'all', 'intern_apprentice']);

export const ruleSchema = z.object({
  id: z.string().regex(/^[A-Z]\d{2}_[A-Z0-9_]+$/),
  title_mn: z.string().min(1),
  title_en: z.string().min(1),
  applies_to: appliesTo,
  inputs: z.array(z.enum(['document', 'questionnaire'])).min(1),
  article: z.string().nullable(),
  check: z.string().min(1),
  severity_if_fail: z.enum(['red', 'yellow']),
  if_unknown: z.literal('yellow'),
  ai_judgment: z.boolean().optional(),
  explain_mn: z.string().min(1),
  explain_en: z.string().min(1),
  escalation: priority,
  effective_from: isoDate.nullable(),
  effective_to: isoDate.nullable(),
  params: z.record(z.string(), z.unknown()),
  score_weight: z
    .object({ fail: z.number().int().positive(), unknown: z.number().int().positive() })
    .refine((w) => w.unknown < w.fail, 'unknown must weigh less than fail'),
  lawyer_verified: z.boolean(),
});

export const jobCategorySchema = z.object({
  id: z.string().regex(/^[a-z_]+$/),
  name_mn: z.string().min(1),
  name_en: z.string().min(1),
  herding: z.boolean().optional(),
  trips_exempt: z.boolean().optional(),
});

export const ruleSetSchema = z.object({
  version: z.string().min(1),
  law: z.string(),
  law_en: z.string(),
  score: z.object({
    start: z.literal(100),
    bands: z.object({ red: band, yellow: band, green: band }),
    p1_cap: z.number().int().positive(),
  }),
  escalation: z.object({
    response_hours: z.object({ P1: z.number(), P2: z.number(), P3: z.number() }),
    weekly_capacity: z.number().int().positive(),
    week_time_zone: z.string(),
  }),
  lists_status: z.string(),
  a122_prohibited: z.array(z.string()),
  a122_cleared: z.array(z.string()),
  light_work: z.array(z.string()),
  not_light_work: z.array(z.string()),
  job_categories: z.array(jobCategorySchema).min(1),
  rules: z.array(ruleSchema).min(1),
});

export type Rule = z.infer<typeof ruleSchema>;
export type RuleSet = z.infer<typeof ruleSetSchema>;
export type Priority = z.infer<typeof priority>;
export type JobCategory = z.infer<typeof jobCategorySchema>;

export const ruleSet: RuleSet = ruleSetSchema.parse(raw);

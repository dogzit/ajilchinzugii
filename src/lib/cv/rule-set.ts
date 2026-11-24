import { z } from 'zod';
import raw from './cv-rules.generated.json';

/** The shape of cv-rules.yaml, validated once when the module loads. */

const band = z.object({ min: z.number().int(), max: z.number().int() });

export const cvRuleSchema = z.object({
  id: z.string().regex(/^C\d{2}_[A-Z0-9_]+$/),
  title_mn: z.string().min(1),
  title_en: z.string().min(1),
  applies_to: z.enum(['all', 'minor']),
  check: z.string().min(1),
  severity_if_fail: z.enum(['red', 'yellow']),
  if_unknown: z.literal('yellow'),
  ai_judgment: z.boolean().optional(),
  explain_mn: z.string().min(1),
  explain_en: z.string().min(1),
  params: z.record(z.string(), z.unknown()),
  score_weight: z
    .object({ fail: z.number().int().positive(), unknown: z.number().int().positive() })
    .refine((w) => w.unknown < w.fail, 'unknown must weigh less than fail'),
  staff_verified: z.boolean(),
});

export const cvRuleSetSchema = z.object({
  version: z.string().min(1),
  score: z.object({
    start: z.literal(100),
    bands: z.object({ red: band, yellow: band, green: band }),
    p1_cap: z.number().int().positive(),
  }),
  experience_levels: z.array(z.string()),
  skills: z.record(z.string(), z.array(z.string())),
  rules: z.array(cvRuleSchema).min(1),
});

export type CvRule = z.infer<typeof cvRuleSchema>;
export type CvRuleSet = z.infer<typeof cvRuleSetSchema>;

export const cvRuleSet: CvRuleSet = cvRuleSetSchema.parse(raw);

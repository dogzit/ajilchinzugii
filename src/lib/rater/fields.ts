import { z } from 'zod';
import { flaggedCategories, payUnits } from './blank';

export { emptyExtraction, emptyFields, flaggedCategories, payUnits } from './blank';

/**
 * The one input format of the rules engine.
 *
 * `extractionSchema` is the spec's "Extraction schema", field for field, with
 * the spec's names: it is what the LLM fills from a document. Questionnaire
 * answers are mapped into the same fields. `contractFieldsSchema` adds the
 * few things only a person can tell us — the job category they pick, what
 * actually happens at work (the reality check), and whether they can quit —
 * so a contract and a questionnaire reach the engine in one shape.
 *
 * null always means unknown, and unknown is never a pass.
 */

const tri = z.boolean().nullable();
const count = z.number().finite().nonnegative().nullable();
export const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
export const clockTime = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);

const evidenceItem = z.object({
  excerpt: z.string(),
  page: z.number().int().positive(),
  confidence: z.number().min(0).max(1),
});

export const extractionSchema = z.object({
  doc_type: z.enum(['employment', 'service', 'internship', 'apprenticeship', 'other']).nullable(),
  language: z.enum(['mn-cyrl', 'mn-latn', 'en', 'other']).nullable(),
  signed: z.object({ employer: tri, employee: tri, guardian: tri, copy_given: tri }),
  worker: z.object({ date_of_birth: isoDate.nullable(), id_copy_attached: tri }),
  employer_kind: z.enum(['company', 'individual', 'organisation']).nullable(),
  job: z.object({
    title: z.string().nullable(),
    duties_listed: tri,
    location_listed: tri,
    tasks: z.array(z.string()),
  }),
  term: z.object({
    kind: z.enum(['indefinite', 'fixed', 'seasonal', 'replacement']).nullable(),
    start: isoDate.nullable(),
    end: isoDate.nullable(),
    extension_months: count,
  }),
  probation: z.object({ months: count, extension_months: count, pay_amount: count }),
  schedule: z.object({
    hours_per_day: count,
    days_per_week: z.number().min(0).max(7).nullable(),
    hours_per_week: count,
    start_time: clockTime.nullable(),
    end_time: clockTime.nullable(),
    overtime_allowed: tri,
    roster_work: tri,
    business_trips: tri,
    lunch_break_min: count,
    rest_days_per_week: z.number().min(0).max(7).nullable(),
  }),
  pay: z.object({
    amount: count,
    unit: z.enum(payUnits).nullable(),
    payments_per_month: count,
    fixed_pay_dates: tri,
    overtime_rate: count,
    night_rate: count,
  }),
  leave: z.object({ annual_days: count }),
  medical_checks: tri,
  via_labour_agency: tri,
  flagged_clauses: z.array(
    z.object({
      category: z.enum(flaggedCategories),
      excerpt: z.string(),
      page: z.number().int().positive(),
      /** The model named this clause but its quote is not in the document. */
      unverified: z.boolean().optional(),
    }),
  ),
  evidence: z.record(z.string(), evidenceItem),
});

export type Extraction = z.infer<typeof extractionSchema>;

/** What only the person can tell us. Asked in the questionnaire, and in the reality check after a document. */
export const extrasSchema = z.object({
  source: z.enum(['questionnaire', 'document']),
  /** A job category id from rules.yaml, picked by the person — never guessed by the model. */
  job_category: z.string().nullable(),
  /** Questionnaire: "Do you have a written contract?" Documents: true. */
  written_contract: tri,
  /** For piece, delivery and day pay: about how many hours it takes to earn one unit. */
  hours_per_unit: count,
  /** Questionnaire: how the trial was paid, when no amount is known. */
  probation_paid: z.enum(['full', 'partial', 'none']).nullable(),
  /** Hours worked beyond the usual schedule, per week. */
  extra_hours_per_week: count,
  /** Questionnaire: is money ever taken from your pay (fines, deposits, damages)? */
  deductions: tri,
  /** Questionnaire: does the employer keep your ID or documents? */
  id_kept: tri,
  can_quit: tri,
  injured: tri,
});

export type Extras = z.infer<typeof extrasSchema>;

export const contractFieldsSchema = extractionSchema.extend(extrasSchema.shape);
export type ContractFields = z.infer<typeof contractFieldsSchema>;


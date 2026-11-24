import type { ContractFields, Extraction, Extras } from './fields';

/**
 * The engine's constants and empty records, with no runtime dependencies —
 * the browser imports these (the questionnaire builds its fields here) and
 * must not pull the zod schemas in with them.
 */

export const flaggedCategories = [
  'fine',
  'deposit',
  'id_retention',
  'unpaid_trial',
  'quit_penalty',
  'non_compete',
  'end_of_season_pay',
  'other',
] as const;

export const payUnits = [
  'hour',
  'day',
  'month',
  'piece',
  'delivery',
  'season',
  'in_kind',
] as const;


/** Every field unknown. The starting point of the questionnaire and of a failed read. */
export function emptyExtraction(): Extraction {
  return {
    doc_type: null,
    language: null,
    signed: { employer: null, employee: null, guardian: null, copy_given: null },
    worker: { date_of_birth: null, id_copy_attached: null },
    employer_kind: null,
    job: { title: null, duties_listed: null, location_listed: null, tasks: [] },
    term: { kind: null, start: null, end: null, extension_months: null },
    probation: { months: null, extension_months: null, pay_amount: null },
    schedule: {
      hours_per_day: null,
      days_per_week: null,
      hours_per_week: null,
      start_time: null,
      end_time: null,
      overtime_allowed: null,
      roster_work: null,
      business_trips: null,
      lunch_break_min: null,
      rest_days_per_week: null,
    },
    pay: {
      amount: null,
      unit: null,
      payments_per_month: null,
      fixed_pay_dates: null,
      overtime_rate: null,
      night_rate: null,
    },
    leave: { annual_days: null },
    medical_checks: null,
    via_labour_agency: null,
    flagged_clauses: [],
    evidence: {},
  };
}

export function emptyFields(source: Extras['source']): ContractFields {
  return {
    ...emptyExtraction(),
    source,
    job_category: null,
    written_contract: source === 'document' ? true : null,
    hours_per_unit: null,
    probation_paid: null,
    extra_hours_per_week: null,
    deductions: null,
    id_kept: null,
    can_quit: null,
    injured: null,
  };
}

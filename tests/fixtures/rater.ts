/**
 * Synthetic contracts for the rules engine. Every value is invented; no
 * person, employer or document is real.
 */
import { emptyFields, type ContractFields } from '../../src/lib/rater/fields';
import { ruleSet, type RuleSet } from '../../src/lib/rater/rule-set';

export const RATED_ON = '2026-11-24';

const ev = (excerpt: string) => ({ excerpt, page: 1, confidence: 0.9 });

/** A lawful written contract for a 16-year-old café worker. */
export function minorDoc(): ContractFields {
  const f = emptyFields('document');
  f.doc_type = 'employment';
  f.language = 'mn-cyrl';
  f.signed = { employer: true, employee: true, guardian: true, copy_given: true };
  f.worker = { date_of_birth: '2010-03-14', id_copy_attached: true };
  f.employer_kind = 'company';
  f.job = { title: 'Зөөгч', duties_listed: true, location_listed: true, tasks: ['хоол зөөх'] };
  f.term = { kind: 'indefinite', start: '2026-09-01', end: null, extension_months: null };
  f.probation = { months: 0, extension_months: null, pay_amount: null };
  f.schedule = {
    hours_per_day: 5,
    days_per_week: 5,
    hours_per_week: 25,
    start_time: '10:00',
    end_time: '16:00',
    overtime_allowed: false,
    roster_work: false,
    business_trips: false,
    lunch_break_min: 60,
    rest_days_per_week: 2,
  };
  f.pay = { amount: 7000, unit: 'hour', payments_per_month: 2, fixed_pay_dates: true, overtime_rate: 1.5, night_rate: 1.2 };
  f.leave = { annual_days: 15 };
  f.medical_checks = true;
  f.via_labour_agency = false;
  f.job_category = 'cafe_restaurant';
  f.extra_hours_per_week = 0;
  f.can_quit = true;
  f.injured = false;
  f.evidence = {
    'worker.date_of_birth': ev('төрсөн 2010 оны 3 сарын 14'),
    'pay.amount': ev('цагийн хөлс 7,000 төгрөг'),
    'schedule.start_time': ev('10:00-16:00'),
  };
  return f;
}

/** A lawful written contract for a 22-year-old shop worker. */
export function adultDoc(): ContractFields {
  const f = minorDoc();
  f.worker = { date_of_birth: '2004-05-01', id_copy_attached: null };
  f.signed.guardian = null;
  f.job = { title: 'Худалдагч', duties_listed: true, location_listed: true, tasks: [] };
  f.job_category = 'retail';
  f.schedule = {
    ...f.schedule,
    hours_per_day: 8,
    hours_per_week: 40,
    start_time: '09:00',
    end_time: '18:00',
    lunch_break_min: 60,
  };
  f.pay = { ...f.pay, amount: 1_200_000, unit: 'month' };
  f.medical_checks = null;
  return f;
}

/** Answers-only fields, as the questionnaire produces them, for a lawful adult job. */
export function adultAnswersFields(): ContractFields {
  const f = adultDoc();
  return { ...f, source: 'questionnaire', evidence: {}, flagged_clauses: [], deductions: false, id_kept: false };
}

export const make = (base: () => ContractFields, change: (f: ContractFields) => void): ContractFields => {
  const f = base();
  change(f);
  return f;
};

/** The rule set with A/122 and the light-work list filled in, for tests only. */
export function withLists(change: Partial<Pick<RuleSet, 'a122_prohibited' | 'a122_cleared' | 'light_work' | 'not_light_work'>>): RuleSet {
  return { ...ruleSet, ...change };
}

export const testLists = withLists({
  a122_prohibited: ['mining', 'construction_helper', 'factory'],
  a122_cleared: ['cafe_restaurant', 'retail', 'tutoring', 'delivery', 'herding_helper', 'arts_sports_ads', 'office_internship'],
  light_work: ['tutoring', 'arts_sports_ads', 'office_internship'],
  not_light_work: ['delivery', 'cafe_restaurant'],
});

import { z } from 'zod';
import {
  ageBand,
  ageOn,
  businessDaysBetween,
  contractMonths,
  dailyHours,
  effectiveHourlyPay,
  nightOverlapMinutes,
  shiftMinutes,
  totalWeeklyHours,
  weeklyHours,
  type AgeBand,
} from './derive';
import type { ContractFields } from './fields';
import { ruleSet as currentRuleSet, type Priority, type Rule, type RuleSet } from './rule-set';
import { computeScore, type ScoreItem } from './score';
import { verdictRank, worstVerdict, type Verdict } from './verdict';

/**
 * The rules engine: a pure function of the fields, the rating date and the
 * rule set. The LLM never reaches this file — it only ever filled the fields.
 *
 * Every rule returns pass (green), fail (its severity) or unknown (yellow).
 * Unknown is never green, and nothing defaults to a passing value. The
 * overall verdict is the worst result; the score and the escalation priority
 * follow from the results alone.
 */

export type Status = 'pass' | 'fail' | 'unknown';

/** A fact behind a result, rendered from `rater.details.<key>` in the message catalogues. */
export type Detail = { key: string; values?: Record<string, string | number> };

export type RuleResult = {
  id: string;
  verdict: Verdict;
  status: Status;
  /** Set on red results only: who needs to act, and how fast. */
  priority: Priority | null;
  details: Detail[];
  /** Field paths whose document excerpts support this result. */
  evidence: string[];
  /** The excerpt of a flagged clause, quoted as the model found it. */
  quotes: string[];
  /** True when the result rests on the model's reading of a clause (G13; M10 on a document). */
  aiJudgment: boolean;
  /** From the reality check: the result came from the hours actually worked. */
  basis?: 'written' | 'actual';
};

export type Rating = {
  ruleSetVersion: string;
  ratedOn: string;
  results: RuleResult[];
  /** Rules this input cannot speak to (e.g. annual leave in the questionnaire). Never shown as green. */
  notChecked: string[];
  verdict: Verdict;
  score: number;
  priority: Priority | null;
  p1: boolean;
  /** True while any rule used is not lawyer-verified: the results page says so. */
  unverified: boolean;
  ageBand: AgeBand;
};

type Outcome = {
  status: Status | 'na';
  severity?: 'red' | 'yellow';
  p1?: boolean;
  details?: Detail[];
  evidence?: string[];
  quotes?: string[];
  aiJudgment?: boolean;
};

type Context = {
  f: ContractFields;
  rule: Rule;
  set: RuleSet;
  date: string;
  age: number | null;
};

const pass = (details: Detail[] = [], evidence: string[] = []): Outcome => ({ status: 'pass', details, evidence });
const fail = (details: Detail[] = [], evidence: string[] = [], extra: Partial<Outcome> = {}): Outcome => ({
  status: 'fail',
  details,
  evidence,
  ...extra,
});
const unknown = (details: Detail[] = [], evidence: string[] = []): Outcome => ({ status: 'unknown', details, evidence });
const notApplicable: Outcome = { status: 'na' };

/** Several sub-checks: any fail fails, else any unknown is unknown, else pass. */
function combine(parts: Outcome[], details: Detail[] = [], evidence: string[] = []): Outcome {
  const merged = { details: [...details, ...parts.flatMap((p) => p.details ?? [])], evidence: [...evidence, ...parts.flatMap((p) => p.evidence ?? [])] };
  if (parts.some((p) => p.status === 'fail')) return { status: 'fail', ...merged };
  if (parts.some((p) => p.status === 'unknown')) return { status: 'unknown', ...merged };
  return { status: 'pass', ...merged };
}

const tri = (value: boolean | null, failWhen: boolean, details: Detail[] = [], evidence: string[] = []): Outcome =>
  value === null ? unknown(details, evidence) : value === failWhen ? fail(details, evidence) : pass(details, evidence);

const round1 = (n: number) => Math.round(n * 10) / 10;

// ── parameters, validated per rule ──────────────────────────────────────────

const severity = z.enum(['red', 'yellow']);
const params = {
  M01_MIN_AGE: z.object({ min_age: z.number(), light_work_min_age: z.number(), p1_under_age: z.number() }),
  M02_THREE_PARTY: z.object({ severity_if_no_guardian: severity }),
  M03_MINOR_WEEKLY_HOURS: z.object({ max_weekly_hours: z.number() }),
  M04_NIGHT_WORK: z.object({ night_start: z.string(), night_end: z.string() }),
  M09_MEDICAL_CHECKS: z.object({ months_between_checks: z.number() }),
  G01_WRITTEN_CONTRACT: z.object({ grace_business_days: z.number(), severity_after_grace: severity }),
  G04_MIN_WAGE: z.object({
    wages: z.array(
      z.object({
        monthly_mnt: z.number().positive(),
        effective_from: z.string().nullable(),
        effective_to: z.string().nullable(),
      }),
    ),
    hourly_basis_hours: z.number().positive(),
  }),
  G05_PAY_FREQUENCY: z.object({ min_payments_per_month: z.number(), severity_if_dates_not_fixed: severity }),
  G06_PROBATION: z.object({
    max_months: z.number(),
    max_extension_months: z.number(),
    no_trial_term_kinds: z.array(z.string()),
    no_trial_doc_types: z.array(z.string()),
  }),
  G07_ADULT_HOURS: z.object({
    max_daily_hours: z.number(),
    max_weekly_hours: z.number(),
    max_overtime_daily_hours: z.number(),
    max_total_weekly_hours: z.number(),
  }),
  G08_OVERTIME_NIGHT_PAY: z.object({ min_overtime_rate: z.number(), min_night_rate: z.number() }),
  G09_REST: z.object({
    min_lunch_minutes: z.number(),
    min_hours_between_days: z.number(),
    min_rest_days: z.number(),
    herding_min_rest_days: z.number(),
  }),
  G10_ANNUAL_LEAVE: z.object({ min_days: z.number() }),
  G11_FIXED_TERM: z.object({ max_total_months: z.number() }),
  G12_INTERN_APPRENTICE_PAY: z.object({ apprentice_min_share: z.number() }),
  G13_FLAGGED_CLAUSES: z.object({ categories: z.array(z.string()) }),
} as const;

type ParamId = keyof typeof params;
const p = <K extends ParamId>(ctx: Context, id: K): z.infer<(typeof params)[K]> =>
  params[id].parse(ctx.rule.params) as z.infer<(typeof params)[K]>;

/** The night window from M04's parameters, shared by G08. */
function nightWindow(set: RuleSet): { start: string; end: string } {
  const rule = set.rules.find((r) => r.id === 'M04_NIGHT_WORK');
  const { night_start, night_end } = params.M04_NIGHT_WORK.parse(rule?.params);
  return { start: night_start, end: night_end };
}

/** The monthly minimum wage in force on a date, and its hourly equivalent. */
export function minimumWage(set: RuleSet, date: string): { monthly: number; hourly: number } | null {
  const rule = set.rules.find((r) => r.id === 'G04_MIN_WAGE');
  if (!rule) return null;
  const { wages, hourly_basis_hours } = params.G04_MIN_WAGE.parse(rule.params);
  const row = wages.find(
    (w) => (w.effective_from === null || w.effective_from <= date) && (w.effective_to === null || date <= w.effective_to),
  );
  return row ? { monthly: row.monthly_mnt, hourly: row.monthly_mnt / hourly_basis_hours } : null;
}

const category = (ctx: Context) => ctx.set.job_categories.find((c) => c.id === ctx.f.job_category);

// ── the evaluators, one per rule id ─────────────────────────────────────────

const evaluators: Record<string, (ctx: Context) => Outcome> = {
  M01_MIN_AGE(ctx) {
    const { min_age, light_work_min_age, p1_under_age } = p(ctx, 'M01_MIN_AGE');
    const { age, f, set } = ctx;
    if (age === null) return unknown([{ key: 'ageUnknown' }]);
    const details = [{ key: 'age', values: { age } }];
    if (age < light_work_min_age) return fail(details, ['worker.date_of_birth'], { p1: age < p1_under_age, severity: 'red' });
    if (age >= min_age) return pass(details, ['worker.date_of_birth']);

    // 13–14: only light work, with a guardian's consent.
    const id = f.job_category;
    const light = id && set.light_work.includes(id) ? true : id && set.not_light_work.includes(id) ? false : null;
    const guardian = f.signed.guardian;
    if (light === false) return fail([...details, { key: 'notLightWork' }]);
    if (guardian === false) return fail([...details, { key: 'guardianNotSigned' }]);
    if (light === true && guardian === true) return pass(details);
    return unknown([...details, ...(light === null ? [{ key: 'lightWorkPending' }] : []), ...(guardian === null ? [{ key: 'guardianUnknown' }] : [])]);
  },

  M02_THREE_PARTY(ctx) {
    const { severity_if_no_guardian } = p(ctx, 'M02_THREE_PARTY');
    const { f } = ctx;
    if (f.written_contract === false) return fail([{ key: 'noWrittenContract' }], [], { severity: severity_if_no_guardian });
    if (f.signed.guardian === false) return fail([{ key: 'guardianNotSigned' }], ['signed.guardian'], { severity: severity_if_no_guardian });

    // "Date of birth stated" is about the paper: only a value read from the
    // document, with its excerpt, counts. A date typed in by the person does not.
    const dobStated =
      f.source === 'document' ? f.worker.date_of_birth !== null && 'worker.date_of_birth' in f.evidence : null;
    const parts: [boolean | null, string][] = [
      [f.signed.employer, 'employerNotSigned'],
      [f.signed.employee, 'workerNotSigned'],
      [f.signed.guardian, 'guardianNotSigned'],
      [dobStated, 'dobNotStated'],
      [f.worker.id_copy_attached, 'idCopyMissing'],
    ];
    const missing = parts.filter(([v]) => v === false).map(([, key]) => ({ key }));
    const evidence = ['signed.employer', 'signed.employee', 'signed.guardian', 'worker.id_copy_attached'];
    if (missing.length) return fail(missing, evidence);
    if (parts.some(([v]) => v === null)) return unknown([{ key: 'signaturesUnknown' }], evidence);
    return pass([], evidence);
  },

  M03_MINOR_WEEKLY_HOURS(ctx) {
    const { max_weekly_hours } = p(ctx, 'M03_MINOR_WEEKLY_HOURS');
    const total = totalWeeklyHours(ctx.f);
    const evidence = ['schedule.hours_per_week', 'schedule.hours_per_day', 'schedule.days_per_week', 'schedule.start_time', 'schedule.end_time'];
    if (total === null) return unknown([{ key: 'hoursUnknown' }], evidence);
    const details: Detail[] = [{ key: 'weeklyHours', values: { hours: round1(total), max: max_weekly_hours } }];
    if (ctx.f.extra_hours_per_week) details.push({ key: 'extraHours', values: { hours: ctx.f.extra_hours_per_week } });
    return total > max_weekly_hours ? fail(details, evidence) : pass(details, evidence);
  },

  M04_NIGHT_WORK(ctx) {
    const { night_start, night_end } = p(ctx, 'M04_NIGHT_WORK');
    const { start_time, end_time } = ctx.f.schedule;
    const evidence = ['schedule.start_time', 'schedule.end_time'];
    if (!start_time || !end_time || shiftMinutes(start_time, end_time) === null) return unknown([{ key: 'shiftUnknown' }], evidence);
    const minutes = nightOverlapMinutes(start_time, end_time, night_start, night_end);
    const details = [{ key: 'shift', values: { start: start_time, end: end_time } }];
    return minutes > 0 ? fail([...details, { key: 'nightMinutes', values: { minutes } }], evidence) : pass(details, evidence);
  },

  M05_MINOR_OVERTIME(ctx) {
    const { overtime_allowed } = ctx.f.schedule;
    const extra = ctx.f.extra_hours_per_week;
    const evidence = ['schedule.overtime_allowed'];
    if (overtime_allowed === true || (extra ?? 0) > 0) {
      return fail(extra ? [{ key: 'extraHours', values: { hours: extra } }] : [{ key: 'overtimeAllowed' }], evidence);
    }
    return overtime_allowed === false ? pass([], evidence) : unknown([{ key: 'overtimeUnknown' }], evidence);
  },

  M06_ROSTER_WORK: (ctx) => tri(ctx.f.schedule.roster_work, true, [], ['schedule.roster_work']),

  M07_BUSINESS_TRIPS(ctx) {
    const trips = ctx.f.schedule.business_trips;
    if (trips === true && category(ctx)?.trips_exempt) return pass([{ key: 'tripsExempt' }], ['schedule.business_trips']);
    return tri(trips, true, [], ['schedule.business_trips']);
  },

  M08_PROHIBITED_JOB(ctx) {
    const id = ctx.f.job_category;
    if (!id || id === 'other') return unknown([{ key: 'categoryUnknown' }]);
    if (ctx.set.a122_prohibited.includes(id)) return fail([{ key: 'onProhibitedList' }], [], { p1: true });
    if (ctx.set.a122_cleared.includes(id)) return pass([{ key: 'notOnProhibitedList' }]);
    return unknown([{ key: 'listsPending' }]);
  },

  M09_MEDICAL_CHECKS: (ctx) => tri(ctx.f.medical_checks, false, [], ['medical_checks']),

  M10_NON_COMPETE(ctx) {
    const clause = ctx.f.flagged_clauses.find((c) => c.category === 'non_compete');
    if (clause) return fail([], [], { quotes: [clause.excerpt].filter(Boolean), aiJudgment: ctx.f.source === 'document' });
    if (ctx.f.written_contract === false) return pass([{ key: 'noWrittenContract' }]);
    if (ctx.f.source === 'document') return { ...pass([{ key: 'aiChecked' }]), aiJudgment: true };
    return unknown([{ key: 'contractNotRead' }]);
  },

  M11_LABOUR_AGENCY: (ctx) => tri(ctx.f.via_labour_agency, true, [], ['via_labour_agency']),

  G01_WRITTEN_CONTRACT(ctx) {
    const { grace_business_days, severity_after_grace } = p(ctx, 'G01_WRITTEN_CONTRACT');
    const { f, date } = ctx;
    if (f.written_contract === false) {
      if (!f.term.start) return fail([{ key: 'noWrittenContract' }, { key: 'startUnknown' }]);
      const days = businessDaysBetween(f.term.start, date);
      const details = [{ key: 'noWrittenContract' }, { key: 'businessDays', values: { days } }];
      return days >= grace_business_days ? fail(details, [], { severity: severity_after_grace }) : fail(details);
    }
    if (f.written_contract === null) return unknown([{ key: 'contractUnknown' }]);
    const evidence = ['signed.employer', 'signed.employee', 'signed.copy_given'];
    const parts: [boolean | null, string][] = [
      [f.signed.employer, 'employerNotSigned'],
      [f.signed.employee, 'workerNotSigned'],
      [f.signed.copy_given, 'noCopy'],
    ];
    const missing = parts.filter(([v]) => v === false).map(([, key]) => ({ key }));
    if (missing.length) return fail(missing, evidence);
    if (parts.some(([v]) => v === null)) return unknown([{ key: 'signaturesUnknown' }], evidence);
    return pass([], evidence);
  },

  G02_DISGUISED_JOB(ctx) {
    const { f } = ctx;
    if (f.written_contract === false) return notApplicable;
    const type = f.doc_type;
    if (type === 'employment' || type === 'internship' || type === 'apprenticeship') return pass([], ['doc_type']);
    if (type === null) return unknown([{ key: 'contractTypeUnknown' }]);
    const describesJob =
      f.schedule.hours_per_day !== null ||
      f.schedule.days_per_week !== null ||
      f.schedule.hours_per_week !== null ||
      f.schedule.start_time !== null ||
      f.job.duties_listed === true ||
      f.pay.unit === 'hour' ||
      f.pay.unit === 'day' ||
      f.pay.unit === 'month';
    return describesJob ? fail([{ key: 'serviceIsJob' }], ['doc_type']) : unknown([{ key: 'serviceUnclear' }], ['doc_type']);
  },

  G03_REQUIRED_TERMS(ctx) {
    const { f } = ctx;
    const missing: string[] = [];
    if (f.job.title === null && f.job.duties_listed !== true) missing.push('duties');
    if (f.job.location_listed !== true) missing.push('location');
    if (f.pay.amount === null && f.pay.unit !== 'in_kind') missing.push('pay');
    const s = f.schedule;
    if ([s.hours_per_day, s.hours_per_week, s.start_time, s.days_per_week].every((v) => v === null)) missing.push('conditions');
    if (f.employer_kind === 'individual') {
      if (dailyHours(f) === null && s.hours_per_week === null) missing.push('hours');
      if (f.pay.fixed_pay_dates !== true) missing.push('payDates');
    }
    return missing.length ? fail(missing.map((term) => ({ key: 'missingTerm', values: { term } }))) : pass();
  },

  G04_MIN_WAGE(ctx) {
    const wage = minimumWage(ctx.set, ctx.date);
    const evidence = ['pay.amount', 'pay.unit'];
    if (!wage) return unknown([{ key: 'minimumUnknown' }], evidence);
    const hourly = effectiveHourlyPay(ctx.f);
    const minimum = { key: 'minimumHourly', values: { pay: Math.round(wage.hourly), monthly: wage.monthly } };
    if (hourly === null) {
      return unknown([ctx.f.pay.amount === null ? { key: 'payUnknown' } : { key: 'hoursNeededForPay' }, minimum], evidence);
    }
    const details: Detail[] = [{ key: 'hourlyPay', values: { pay: Math.round(hourly) } }, minimum];
    if (ctx.f.pay.unit === 'in_kind') details.unshift({ key: 'inKindOnly' });
    return hourly < wage.hourly ? fail(details, evidence) : pass(details, evidence);
  },

  G05_PAY_FREQUENCY(ctx) {
    const { min_payments_per_month, severity_if_dates_not_fixed } = p(ctx, 'G05_PAY_FREQUENCY');
    const { payments_per_month, fixed_pay_dates } = ctx.f.pay;
    const evidence = ['pay.payments_per_month', 'pay.fixed_pay_dates'];
    if (payments_per_month === null) {
      return fixed_pay_dates === false
        ? fail([{ key: 'datesNotFixed' }], evidence, { severity: severity_if_dates_not_fixed })
        : unknown([{ key: 'frequencyUnknown' }], evidence);
    }
    const details = [{ key: 'paymentsPerMonth', values: { count: payments_per_month } }];
    if (payments_per_month < min_payments_per_month) return fail(details, evidence);
    if (fixed_pay_dates === false) return fail([...details, { key: 'datesNotFixed' }], evidence, { severity: severity_if_dates_not_fixed });
    return fixed_pay_dates === true ? pass(details, evidence) : unknown([...details, { key: 'datesUnknown' }], evidence);
  },

  G06_PROBATION(ctx) {
    const { max_months, max_extension_months, no_trial_term_kinds, no_trial_doc_types } = p(ctx, 'G06_PROBATION');
    const { f } = ctx;
    const { months, extension_months, pay_amount } = f.probation;
    const evidence = ['probation.months', 'probation.extension_months', 'probation.pay_amount'];
    if (months === null) return unknown([{ key: 'trialUnknown' }], evidence);
    if (months === 0) return pass([{ key: 'noTrial' }], evidence);

    const parts: Outcome[] = [];
    if ((f.term.kind && no_trial_term_kinds.includes(f.term.kind)) || (f.doc_type && no_trial_doc_types.includes(f.doc_type))) {
      parts.push(fail([{ key: 'trialNotAllowed' }]));
    }
    parts.push(months > max_months ? fail([{ key: 'trialMonths', values: { months: round1(months) } }]) : pass([{ key: 'trialMonths', values: { months: round1(months) } }]));
    if (extension_months !== null && extension_months > max_extension_months) {
      parts.push(fail([{ key: 'trialExtension', values: { months: round1(extension_months) } }]));
    }
    if (f.probation_paid === 'none' || f.probation_paid === 'partial') parts.push(fail([{ key: 'trialUnderpaid' }]));
    else if (f.probation_paid === 'full') parts.push(pass());
    else if (pay_amount === null || f.pay.amount === null) parts.push(unknown([{ key: 'trialPayUnknown' }]));
    else parts.push(pay_amount < f.pay.amount ? fail([{ key: 'trialUnderpaid' }]) : pass());
    return combine(parts, [], evidence);
  },

  G07_ADULT_HOURS(ctx) {
    const { max_daily_hours, max_weekly_hours, max_total_weekly_hours } = p(ctx, 'G07_ADULT_HOURS');
    const daily = dailyHours(ctx.f);
    const weekly = weeklyHours(ctx.f);
    const total = totalWeeklyHours(ctx.f);
    const evidence = ['schedule.hours_per_day', 'schedule.hours_per_week', 'schedule.start_time', 'schedule.end_time', 'schedule.days_per_week'];
    const parts: Outcome[] = [
      daily === null ? unknown([{ key: 'hoursUnknown' }]) : daily > max_daily_hours ? fail([{ key: 'dailyHours', values: { hours: round1(daily), max: max_daily_hours } }]) : pass([{ key: 'dailyHours', values: { hours: round1(daily), max: max_daily_hours } }]),
      weekly === null ? unknown() : weekly > max_weekly_hours ? fail([{ key: 'weeklyHours', values: { hours: round1(weekly), max: max_weekly_hours } }]) : pass([{ key: 'weeklyHours', values: { hours: round1(weekly), max: max_weekly_hours } }]),
      total === null ? unknown() : total > max_total_weekly_hours ? fail([{ key: 'totalWeeklyHours', values: { hours: round1(total), max: max_total_weekly_hours } }]) : pass(),
    ];
    return combine(parts, [], evidence);
  },

  G08_OVERTIME_NIGHT_PAY(ctx) {
    const { min_overtime_rate, min_night_rate } = p(ctx, 'G08_OVERTIME_NIGHT_PAY');
    const { f, set } = ctx;
    const night = nightWindow(set);
    const { overtime_allowed, start_time, end_time } = f.schedule;
    const overtime = overtime_allowed === true || (f.extra_hours_per_week ?? 0) > 0 ? true : overtime_allowed === false ? false : null;
    const nightWork =
      start_time && end_time && shiftMinutes(start_time, end_time) !== null
        ? nightOverlapMinutes(start_time, end_time, night.start, night.end) > 0
        : null;
    const rate = (happens: boolean | null, value: number | null, min: number, key: string): Outcome => {
      if (happens === false) return pass();
      if (happens === null) return unknown([{ key: `${key}Unknown` }]);
      if (value === null) return unknown([{ key: 'rateNotStated', values: { kind: key } }]);
      return value < min ? fail([{ key: `${key}Rate`, values: { rate: value, min } }]) : pass([{ key: `${key}Rate`, values: { rate: value, min } }]);
    };
    return combine(
      [rate(overtime, f.pay.overtime_rate, min_overtime_rate, 'overtime'), rate(nightWork, f.pay.night_rate, min_night_rate, 'night')],
      [],
      ['pay.overtime_rate', 'pay.night_rate'],
    );
  },

  G09_REST(ctx) {
    const { min_lunch_minutes, min_hours_between_days, min_rest_days, herding_min_rest_days } = p(ctx, 'G09_REST');
    const { f } = ctx;
    const lunch = f.schedule.lunch_break_min;
    const span = shiftMinutes(f.schedule.start_time, f.schedule.end_time);
    const restDays = f.schedule.rest_days_per_week ?? (f.schedule.days_per_week !== null ? 7 - f.schedule.days_per_week : null);
    const minRest = category(ctx)?.herding ? herding_min_rest_days : min_rest_days;
    const parts: Outcome[] = [
      lunch === null ? unknown([{ key: 'lunchUnknown' }]) : lunch < min_lunch_minutes ? fail([{ key: 'lunch', values: { minutes: lunch, min: min_lunch_minutes } }]) : pass(),
      span === null ? unknown() : 24 - span / 60 < min_hours_between_days ? fail([{ key: 'restBetween', values: { hours: round1(24 - span / 60), min: min_hours_between_days } }]) : pass(),
      restDays === null ? unknown() : restDays < minRest ? fail([{ key: 'restDays', values: { days: restDays, min: minRest } }]) : pass(),
    ];
    return combine(parts, [], ['schedule.lunch_break_min', 'schedule.rest_days_per_week', 'schedule.days_per_week']);
  },

  G10_ANNUAL_LEAVE(ctx) {
    const { min_days } = p(ctx, 'G10_ANNUAL_LEAVE');
    const days = ctx.f.leave.annual_days;
    if (days === null) return unknown([{ key: 'leaveUnknown' }], ['leave.annual_days']);
    const details = [{ key: 'leaveDays', values: { days, min: min_days } }];
    return days < min_days ? fail(details, ['leave.annual_days']) : pass(details, ['leave.annual_days']);
  },

  G11_FIXED_TERM(ctx) {
    const { max_total_months } = p(ctx, 'G11_FIXED_TERM');
    const kind = ctx.f.term.kind;
    if (kind === 'indefinite' || kind === 'seasonal' || kind === 'replacement') return notApplicable;
    if (kind === null) return unknown([{ key: 'termUnknown' }], ['term.kind']);
    const months = contractMonths(ctx.f);
    const evidence = ['term.kind', 'term.start', 'term.end', 'term.extension_months'];
    if (months !== null && months > max_total_months) {
      return fail([{ key: 'contractMonths', values: { months: round1(months), max: max_total_months } }, { key: 'becomesIndefinite' }], evidence);
    }
    if (months === null) return unknown([{ key: 'termDatesUnknown' }], evidence);
    // The 2-year limit is what can be checked. Whether a fixed term is
    // allowed for this job at all is not encoded yet, so the result says so.
    return pass([{ key: 'contractMonths', values: { months: round1(months), max: max_total_months } }, { key: 'fixedTermCheckCases' }], evidence);
  },

  G12_INTERN_APPRENTICE_PAY(ctx) {
    if (ctx.f.doc_type === 'apprenticeship') return unknown([{ key: 'apprenticeBaseUnknown' }], ['doc_type']);
    const wage = minimumWage(ctx.set, ctx.date);
    const hourly = effectiveHourlyPay(ctx.f);
    if (!wage || hourly === null) return unknown([{ key: 'payUnknown' }], ['pay.amount', 'pay.unit']);
    const details: Detail[] = [{ key: 'hourlyPay', values: { pay: Math.round(hourly) } }, { key: 'minimumHourly', values: { pay: Math.round(wage.hourly), monthly: wage.monthly } }];
    return hourly < wage.hourly ? fail(details, ['pay.amount', 'pay.unit']) : pass(details, ['pay.amount', 'pay.unit']);
  },

  G13_FLAGGED_CLAUSES(ctx) {
    const { categories } = p(ctx, 'G13_FLAGGED_CLAUSES');
    const { f } = ctx;
    if (f.source === 'questionnaire') {
      // From the person's own answers: not AI judgment.
      const found = [
        ...(f.deductions === true ? [{ key: 'clause', values: { category: 'fine' } }] : []),
        ...(f.id_kept === true ? [{ key: 'clause', values: { category: 'id_retention' } }] : []),
      ];
      if (found.length) return fail(found);
      return f.deductions === false && f.id_kept === false ? pass() : unknown([{ key: 'clausesUnknown' }]);
    }
    const flagged = f.flagged_clauses.filter((c) => categories.includes(c.category));
    if (!flagged.length) return { ...pass([{ key: 'aiChecked' }]), aiJudgment: true };
    return fail(
      [...new Set(flagged.map((c) => c.category))].map((category) => ({ key: 'clause', values: { category } })),
      [],
      { quotes: flagged.map((c) => c.excerpt).filter(Boolean), aiJudgment: true },
    );
  },

  Q01_UNPAID(ctx) {
    const { amount, unit } = ctx.f.pay;
    const evidence = ['pay.amount', 'pay.unit'];
    if (unit === 'in_kind') return fail([{ key: 'inKindOnly' }], evidence, { p1: true });
    if (amount === null) return unknown([{ key: 'payUnknown' }], evidence);
    return amount > 0 ? pass([], evidence) : fail([{ key: 'unpaid' }], evidence, { p1: true });
  },

  Q02_CANNOT_QUIT(ctx) {
    const v = ctx.f.can_quit;
    return v === false ? fail([], [], { p1: true }) : v === true ? pass() : unknown();
  },

  Q03_INJURED(ctx) {
    const v = ctx.f.injured;
    return v === true ? fail([], [], { p1: true }) : v === false ? pass() : unknown();
  },
};

// ── running the rules ───────────────────────────────────────────────────────

/** Age at the start of work (or today, if no start date is known). */
export function ageAtStart(f: ContractFields, ratingDate: string): number | null {
  const dob = f.worker.date_of_birth;
  if (!dob) return null;
  return ageOn(dob, f.term.start ?? ratingDate);
}

function applies(rule: Rule, age: number | null, f: ContractFields): 'yes' | 'no' | 'maybe' {
  switch (rule.applies_to) {
    case 'all':
      return 'yes';
    case 'minor':
      return age === null ? 'maybe' : age < 18 ? 'yes' : 'no';
    case 'minor_15_17':
      return age === null ? 'maybe' : age >= 15 && age < 18 ? 'yes' : 'no';
    case 'adult':
      return age === null ? 'maybe' : age >= 18 ? 'yes' : 'no';
    case 'intern_apprentice':
      return f.doc_type === 'internship' || f.doc_type === 'apprenticeship' ? 'yes' : 'no';
  }
}

const inForce = (rule: Rule, date: string) =>
  (rule.effective_from === null || rule.effective_from <= date) && (rule.effective_to === null || date <= rule.effective_to);

type Evaluation = { results: RuleResult[]; notChecked: string[]; age: number | null };

export function evaluate(f: ContractFields, ratingDate: string, set: RuleSet = currentRuleSet): Evaluation {
  const age = ageAtStart(f, ratingDate);
  const results: RuleResult[] = [];
  const notChecked: string[] = [];

  for (const rule of set.rules) {
    if (!inForce(rule, ratingDate)) continue;
    const scope = applies(rule, age, f);
    if (scope === 'no') continue;
    if (!rule.inputs.includes(f.source)) {
      notChecked.push(rule.id);
      continue;
    }
    const evaluator = evaluators[rule.id];
    if (!evaluator) throw new Error(`No evaluator for rule ${rule.id}`);

    let outcome = evaluator({ f, rule, set, date: ratingDate, age });
    if (outcome.status === 'na') continue;
    // An age-scoped rule that fails while the age is unknown cannot be held
    // against the employer — but it is not a pass either.
    if (scope === 'maybe' && outcome.status === 'fail') {
      outcome = { ...outcome, status: 'unknown', p1: false, details: [{ key: 'ageUnknown' }, ...(outcome.details ?? [])] };
    }

    const status = outcome.status as Status;
    const verdict: Verdict = status === 'pass' ? 'green' : status === 'unknown' ? rule.if_unknown : (outcome.severity ?? rule.severity_if_fail);
    results.push({
      id: rule.id,
      verdict,
      status,
      priority: verdict === 'red' ? (outcome.p1 ? 'P1' : rule.escalation) : null,
      details: outcome.details ?? [],
      evidence: (outcome.evidence ?? []).filter((path) => path in f.evidence),
      quotes: outcome.quotes ?? [],
      aiJudgment: Boolean(outcome.aiJudgment),
    });
  }

  return { results, notChecked, age };
}

const severityRank = (r: RuleResult) => verdictRank[r.verdict] * 2 + (r.status === 'fail' ? 1 : 0);
const order = (set: RuleSet) => new Map(set.rules.map((rule, index) => [rule.id, index]));

function summarize(evaluation: Evaluation, ratingDate: string, set: RuleSet): Rating {
  const { results, notChecked, age } = evaluation;
  const position = order(set);
  const sorted = [...results].sort(
    (a, b) => verdictRank[b.verdict] - verdictRank[a.verdict] || (position.get(a.id) ?? 0) - (position.get(b.id) ?? 0),
  );
  const verdict = worstVerdict(sorted.map((r) => r.verdict));
  const reds = sorted.filter((r) => r.verdict === 'red');
  const p1 = reds.some((r) => r.priority === 'P1');
  const priority: Priority | null = p1 ? 'P1' : reds.some((r) => r.priority === 'P2') ? 'P2' : reds.length ? 'P3' : null;
  const weights = new Map(set.rules.map((rule) => [rule.id, rule.score_weight]));
  const items: ScoreItem[] = sorted.map((r) => ({ status: r.status, weight: weights.get(r.id)! }));
  const used = new Set(sorted.map((r) => r.id));

  return {
    ruleSetVersion: set.version,
    ratedOn: ratingDate,
    results: sorted,
    notChecked,
    verdict,
    score: computeScore(items, verdict, p1, set.score),
    priority,
    p1,
    unverified: set.rules.some((rule) => used.has(rule.id) && !rule.lawyer_verified),
    ageBand: ageBand(age),
  };
}

/** `rate(fields, ratingDate, ruleSet) → results` (spec, "Rules engine"). */
export function rate(f: ContractFields, ratingDate: string, set: RuleSet = currentRuleSet): Rating {
  return summarize(evaluate(f, ratingDate, set), ratingDate, set);
}

/**
 * The reality check: a contract can show lawful hours while the job runs
 * longer. Both are rated and, rule by rule, the worse result is kept.
 */
export function rateWithReality(
  written: ContractFields,
  actual: ContractFields,
  ratingDate: string,
  set: RuleSet = currentRuleSet,
): Rating {
  const a = evaluate(written, ratingDate, set);
  const b = evaluate(actual, ratingDate, set);
  const fromActual = new Map(b.results.map((r) => [r.id, r]));
  const merged = a.results.map((r) => {
    const other = fromActual.get(r.id);
    if (!other) return { ...r, basis: 'written' as const };
    return severityRank(other) > severityRank(r) ? { ...other, basis: 'actual' as const } : { ...r, basis: 'written' as const };
  });
  for (const r of b.results) if (!merged.some((m) => m.id === r.id)) merged.push({ ...r, basis: 'actual' });
  return summarize(
    { results: merged, notChecked: a.notChecked.filter((id) => !merged.some((m) => m.id === id)), age: a.age ?? b.age },
    ratingDate,
    set,
  );
}

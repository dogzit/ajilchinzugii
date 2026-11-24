import { describe, expect, it } from 'vitest';
import { rate } from '../../src/lib/rater/engine';
import type { ContractFields } from '../../src/lib/rater/fields';
import { ruleSet, type RuleSet } from '../../src/lib/rater/rule-set';
import { adultAnswersFields, adultDoc, make, minorDoc, RATED_ON, testLists } from '../fixtures/rater';

/**
 * Every rule: at least three passing, three failing and one unknown case
 * (spec, "Testing and acceptance"). Each case changes one lawful base
 * contract just enough to move the rule under test.
 */

type Case = { name: string; fields: ContractFields; set?: RuleSet; date?: string };
type Table = Record<string, { pass: Case[]; fail: Case[]; unknown: Case[] }>;

const c = (name: string, fields: ContractFields, set?: RuleSet, date?: string): Case => ({ name, fields, set, date });
const minor = (change: (f: ContractFields) => void) => make(minorDoc, change);
const adult = (change: (f: ContractFields) => void) => make(adultDoc, change);
const answers = (change: (f: ContractFields) => void) => make(adultAnswersFields, change);
const minorAnswers = (change: (f: ContractFields) => void) =>
  make(adultAnswersFields, (f) => {
    f.worker.date_of_birth = '2010-03-14';
    f.schedule = { ...f.schedule, hours_per_day: 5, hours_per_week: 25, start_time: '10:00', end_time: '16:00' };
    f.pay = { ...f.pay, amount: 7000, unit: 'hour' };
    f.signed.guardian = true;
    change(f);
  });

const table: Table = {
  M01_MIN_AGE: {
    pass: [
      c('16 at start', minorDoc()),
      c('turns 15 on the start date', minor((f) => (f.worker.date_of_birth = '2011-09-01'))),
      c('13, light work, guardian signed', minor((f) => { f.worker.date_of_birth = '2013-01-10'; f.job_category = 'tutoring'; }), testLists),
    ],
    fail: [
      c('12 at start', minor((f) => (f.worker.date_of_birth = '2014-02-01'))),
      c('14, not light work', minor((f) => { f.worker.date_of_birth = '2012-06-01'; f.job_category = 'delivery'; }), testLists),
      c('14, light work, guardian did not sign', minor((f) => { f.worker.date_of_birth = '2012-06-01'; f.job_category = 'tutoring'; f.signed.guardian = false; }), testLists),
    ],
    unknown: [
      c('no date of birth', minor((f) => (f.worker.date_of_birth = null))),
      c('14, light-work list not loaded', minor((f) => (f.worker.date_of_birth = '2012-06-01'))),
    ],
  },
  M02_THREE_PARTY: {
    pass: [
      c('all three signed, ID attached', minorDoc()),
      c('17-year-old, all in order', minor((f) => (f.worker.date_of_birth = '2009-01-01'))),
      c('15-year-old, all in order', minor((f) => (f.worker.date_of_birth = '2011-05-05'))),
    ],
    fail: [
      c('guardian did not sign', minor((f) => (f.signed.guardian = false))),
      c('no ID copy', minor((f) => (f.worker.id_copy_attached = false))),
      c('date of birth typed in, not on the paper', minor((f) => { delete f.evidence['worker.date_of_birth']; })),
    ],
    unknown: [c('guardian signature unreadable', minor((f) => (f.signed.guardian = null)))],
  },
  M03_MINOR_WEEKLY_HOURS: {
    pass: [
      c('25 hours', minorDoc()),
      c('exactly 30 hours', minor((f) => { f.schedule.hours_per_week = 30; f.schedule.hours_per_day = 6; f.schedule.end_time = '17:00'; })),
      c('29.5 hours', minor((f) => { f.schedule.hours_per_week = 29.5; f.schedule.hours_per_day = 5.9; })),
    ],
    fail: [
      c('30.5 hours', minor((f) => { f.schedule.hours_per_week = 30.5; f.schedule.hours_per_day = 6.1; })),
      c('6 days of 6 hours', minor((f) => { f.schedule.days_per_week = 6; f.schedule.hours_per_day = 6; f.schedule.end_time = '17:00'; f.schedule.hours_per_week = null; })),
      c('25 written + 8 extra', minor((f) => (f.extra_hours_per_week = 8))),
    ],
    unknown: [c('no hours at all', minor((f) => { f.schedule = { ...f.schedule, hours_per_day: null, hours_per_week: null, start_time: null, end_time: null }; }))],
  },
  M04_NIGHT_WORK: {
    pass: [
      c('10:00–16:00', minorDoc()),
      c('ends exactly at 22:00', minor((f) => { f.schedule.start_time = '17:00'; f.schedule.end_time = '22:00'; })),
      c('starts exactly at 06:00', minor((f) => { f.schedule.start_time = '06:00'; f.schedule.end_time = '11:00'; })),
    ],
    fail: [
      c('ends at 22:30', minor((f) => { f.schedule.start_time = '17:30'; f.schedule.end_time = '22:30'; })),
      c('past midnight', minor((f) => { f.schedule.start_time = '20:00'; f.schedule.end_time = '01:00'; })),
      c('starts at 05:30', minor((f) => { f.schedule.start_time = '05:30'; f.schedule.end_time = '10:30'; })),
    ],
    unknown: [c('no times', minor((f) => { f.schedule.start_time = null; f.schedule.end_time = null; }))],
  },
  M05_MINOR_OVERTIME: {
    pass: [
      c('no overtime', minorDoc()),
      c('no overtime, questionnaire', minorAnswers(() => {})),
      c('no overtime, 15-year-old', minor((f) => (f.worker.date_of_birth = '2011-01-01'))),
    ],
    fail: [
      c('overtime allowed', minor((f) => (f.schedule.overtime_allowed = true))),
      c('extra hours worked', minor((f) => (f.extra_hours_per_week = 2))),
      c('both', minor((f) => { f.schedule.overtime_allowed = true; f.extra_hours_per_week = 5; })),
    ],
    unknown: [c('not stated', minor((f) => { f.schedule.overtime_allowed = null; f.extra_hours_per_week = null; }))],
  },
  M06_ROSTER_WORK: {
    pass: [c('none', minorDoc()), c('none, questionnaire', minorAnswers(() => {})), c('none, 17', minor((f) => (f.worker.date_of_birth = '2009-02-02')))],
    fail: [
      c('roster work', minor((f) => (f.schedule.roster_work = true))),
      c('roster, questionnaire', minorAnswers((f) => (f.schedule.roster_work = true))),
      c('roster, 15', minor((f) => { f.worker.date_of_birth = '2011-02-02'; f.schedule.roster_work = true; })),
    ],
    unknown: [c('not stated', minor((f) => (f.schedule.roster_work = null)))],
  },
  M07_BUSINESS_TRIPS: {
    pass: [
      c('no trips', minorDoc()),
      c('trips, but commercials', minor((f) => { f.schedule.business_trips = true; f.job_category = 'arts_sports_ads'; })),
      c('no trips, questionnaire', minorAnswers(() => {})),
    ],
    fail: [
      c('trips, café', minor((f) => (f.schedule.business_trips = true))),
      c('trips, delivery', minor((f) => { f.schedule.business_trips = true; f.job_category = 'delivery'; })),
      c('trips, no category', minor((f) => { f.schedule.business_trips = true; f.job_category = null; })),
    ],
    unknown: [c('not stated', minor((f) => (f.schedule.business_trips = null)))],
  },
  M08_PROHIBITED_JOB: {
    pass: [
      c('café, cleared', minorDoc(), testLists),
      c('retail, cleared', minor((f) => (f.job_category = 'retail')), testLists),
      c('tutoring, cleared', minor((f) => (f.job_category = 'tutoring')), testLists),
    ],
    fail: [
      c('mining', minor((f) => (f.job_category = 'mining')), testLists),
      c('construction helper', minor((f) => (f.job_category = 'construction_helper')), testLists),
      c('factory', minor((f) => (f.job_category = 'factory')), testLists),
    ],
    unknown: [
      c('A/122 not loaded yet', minorDoc()),
      c('other', minor((f) => (f.job_category = 'other')), testLists),
      c('no category', minor((f) => (f.job_category = null)), testLists),
    ],
  },
  M09_MEDICAL_CHECKS: {
    pass: [c('checks stated', minorDoc()), c('checks, 15', minor((f) => (f.worker.date_of_birth = '2011-03-03'))), c('checks, 17', minor((f) => (f.worker.date_of_birth = '2009-03-03')))],
    fail: [
      c('no checks', minor((f) => (f.medical_checks = false))),
      c('no checks, 15', minor((f) => { f.medical_checks = false; f.worker.date_of_birth = '2011-03-03'; })),
      c('no checks, 17', minor((f) => { f.medical_checks = false; f.worker.date_of_birth = '2009-03-03'; })),
    ],
    unknown: [c('not stated', minor((f) => (f.medical_checks = null)))],
  },
  M10_NON_COMPETE: {
    pass: [
      c('document, none flagged', minorDoc()),
      c('no written contract', minorAnswers((f) => { f.written_contract = false; })),
      c('only a fine flagged', minor((f) => (f.flagged_clauses = [{ category: 'fine', excerpt: 'торгууль', page: 1 }]))),
    ],
    fail: [
      c('non-compete flagged', minor((f) => (f.flagged_clauses = [{ category: 'non_compete', excerpt: 'өөр газар ажиллахгүй', page: 2 }]))),
      c('non-compete among others', minor((f) => (f.flagged_clauses = [{ category: 'fine', excerpt: 'a', page: 1 }, { category: 'non_compete', excerpt: 'b', page: 1 }]))),
      c('non-compete, 17', minor((f) => { f.worker.date_of_birth = '2009-01-01'; f.flagged_clauses = [{ category: 'non_compete', excerpt: 'c', page: 1 }]; })),
    ],
    unknown: [c('questionnaire, written contract not read', minorAnswers((f) => (f.written_contract = true)))],
  },
  M11_LABOUR_AGENCY: {
    pass: [c('direct hire', minorDoc()), c('direct, questionnaire', minorAnswers(() => {})), c('direct, 15', minor((f) => (f.worker.date_of_birth = '2011-01-01')))],
    fail: [
      c('agency', minor((f) => (f.via_labour_agency = true))),
      c('agency, questionnaire', minorAnswers((f) => (f.via_labour_agency = true))),
      c('agency, 17', minor((f) => { f.via_labour_agency = true; f.worker.date_of_birth = '2009-01-01'; })),
    ],
    unknown: [c('not stated', minor((f) => (f.via_labour_agency = null)))],
  },
  G01_WRITTEN_CONTRACT: {
    pass: [c('signed, copy given', adultDoc()), c('minor, signed', minorDoc()), c('questionnaire, all yes', adultAnswersFields())],
    fail: [
      c('no contract after 3 weeks (red)', answers((f) => { f.written_contract = false; f.term.start = '2026-11-01'; })),
      c('no contract, started yesterday (yellow)', answers((f) => { f.written_contract = false; f.term.start = '2026-11-23'; })),
      c('no copy given', adult((f) => (f.signed.copy_given = false))),
    ],
    unknown: [c('do not know', answers((f) => (f.written_contract = null)))],
  },
  G02_DISGUISED_JOB: {
    pass: [c('employment contract', adultDoc()), c('internship', adult((f) => (f.doc_type = 'internship'))), c('apprenticeship', adult((f) => (f.doc_type = 'apprenticeship')))],
    fail: [
      c('service contract with set hours', adult((f) => (f.doc_type = 'service'))),
      c('service contract, monthly pay only', adult((f) => { f.doc_type = 'service'; f.schedule = { ...f.schedule, hours_per_day: null, days_per_week: null, hours_per_week: null, start_time: null }; })),
      c('"other" contract with duties', adult((f) => (f.doc_type = 'other'))),
    ],
    unknown: [c('type unknown', adult((f) => (f.doc_type = null)))],
  },
  G03_REQUIRED_TERMS: {
    pass: [c('all terms', adultDoc()), c('individual employer, hours and dates stated', adult((f) => (f.employer_kind = 'individual'))), c('minor, all terms', minorDoc())],
    fail: [
      c('no location', adult((f) => (f.job.location_listed = false))),
      c('no pay amount', adult((f) => (f.pay.amount = null))),
      c('individual employer, pay dates not fixed', adult((f) => { f.employer_kind = 'individual'; f.pay.fixed_pay_dates = false; })),
    ],
    unknown: [],
  },
  G04_MIN_WAGE: {
    pass: [c('7,000 an hour', minorDoc()), c('1.2m a month for 40 h', adultDoc()), c('per delivery, 8,000 for an hour', adult((f) => { f.pay.amount = 8000; f.pay.unit = 'delivery'; f.hours_per_unit = 1; }))],
    fail: [
      c('3,000 an hour', minor((f) => (f.pay.amount = 3000))),
      c('600k a month for 40 h', adult((f) => (f.pay.amount = 600_000))),
      c('food and lodging only', adult((f) => { f.pay.unit = 'in_kind'; f.pay.amount = null; })),
    ],
    unknown: [
      c('per delivery, hours unknown', adult((f) => { f.pay.amount = 5000; f.pay.unit = 'delivery'; f.hours_per_unit = null; })),
      c('no amount', adult((f) => (f.pay.amount = null))),
    ],
  },
  G05_PAY_FREQUENCY: {
    pass: [c('twice, fixed', adultDoc()), c('weekly, fixed', adult((f) => (f.pay.payments_per_month = 4))), c('daily, fixed', adult((f) => (f.pay.payments_per_month = 20)))],
    fail: [
      c('monthly (red)', adult((f) => (f.pay.payments_per_month = 1))),
      c('end of season (red)', adult((f) => (f.pay.payments_per_month = 0))),
      c('twice, dates not fixed (yellow)', adult((f) => (f.pay.fixed_pay_dates = false))),
    ],
    unknown: [c('not stated', adult((f) => { f.pay.payments_per_month = null; f.pay.fixed_pay_dates = null; }))],
  },
  G06_PROBATION: {
    pass: [
      c('no trial', adultDoc()),
      c('2 months at full pay', adult((f) => (f.probation = { months: 2, extension_months: null, pay_amount: 1_200_000 }))),
      c('3 + 3 months, paid in full (answers)', answers((f) => { f.probation = { months: 3, extension_months: 3, pay_amount: null }; f.probation_paid = 'full'; })),
    ],
    fail: [
      c('4 months', adult((f) => (f.probation = { months: 4, extension_months: null, pay_amount: 1_200_000 }))),
      c('unpaid trial', answers((f) => { f.probation = { months: 0.5, extension_months: null, pay_amount: null }; f.probation_paid = 'none'; })),
      c('trial on seasonal work', adult((f) => { f.term.kind = 'seasonal'; f.probation = { months: 1, extension_months: null, pay_amount: 1_200_000 }; })),
    ],
    unknown: [c('trial pay not stated', adult((f) => (f.probation = { months: 2, extension_months: null, pay_amount: null })))],
  },
  G07_ADULT_HOURS: {
    pass: [
      c('8 h × 5', adultDoc()),
      c('7 h × 5', adult((f) => { f.schedule.hours_per_day = 7; f.schedule.end_time = '17:00'; f.schedule.hours_per_week = 35; })),
      c('8 h × 5 + 10 extra (50 total)', adult((f) => (f.extra_hours_per_week = 10))),
    ],
    fail: [
      c('10-hour days', adult((f) => { f.schedule.hours_per_day = 10; f.schedule.end_time = '20:00'; f.schedule.hours_per_week = 50; })),
      c('6 days of 8 (48 ordinary)', adult((f) => { f.schedule.days_per_week = 6; f.schedule.hours_per_week = null; f.schedule.rest_days_per_week = 1; })),
      c('40 + 20 extra (60 total)', adult((f) => (f.extra_hours_per_week = 20))),
    ],
    unknown: [c('no hours', adult((f) => { f.schedule = { ...f.schedule, hours_per_day: null, hours_per_week: null, start_time: null, end_time: null }; }))],
  },
  G08_OVERTIME_NIGHT_PAY: {
    pass: [
      c('no overtime, no nights', adultDoc()),
      c('overtime at 1.5', adult((f) => (f.schedule.overtime_allowed = true))),
      c('night shift at 1.2', adult((f) => { f.schedule.start_time = '14:00'; f.schedule.end_time = '23:00'; })),
    ],
    fail: [
      c('overtime at 1.2', adult((f) => { f.schedule.overtime_allowed = true; f.pay.overtime_rate = 1.2; })),
      c('night at 1.0', adult((f) => { f.schedule.start_time = '14:00'; f.schedule.end_time = '23:00'; f.pay.night_rate = 1; })),
      c('extra hours at 1.0', adult((f) => { f.extra_hours_per_week = 6; f.pay.overtime_rate = 1; })),
    ],
    unknown: [c('overtime, rate not stated', adult((f) => { f.schedule.overtime_allowed = true; f.pay.overtime_rate = null; }))],
  },
  G09_REST: {
    pass: [
      c('1 h lunch, 2 days off', adultDoc()),
      c('90 min lunch', adult((f) => (f.schedule.lunch_break_min = 90))),
      c('herding helper, 2 days off', adult((f) => (f.job_category = 'herding_helper'))),
    ],
    fail: [
      c('30-minute lunch', adult((f) => (f.schedule.lunch_break_min = 30))),
      c('one day off', adult((f) => { f.schedule.days_per_week = 6; f.schedule.rest_days_per_week = 1; })),
      c('14-hour span', adult((f) => { f.schedule.start_time = '07:00'; f.schedule.end_time = '21:00'; })),
    ],
    unknown: [c('lunch not stated', adult((f) => (f.schedule.lunch_break_min = null)))],
  },
  G10_ANNUAL_LEAVE: {
    pass: [c('15 days', adultDoc()), c('20 days', adult((f) => (f.leave.annual_days = 20))), c('15 days, minor', minorDoc())],
    fail: [c('10 days', adult((f) => (f.leave.annual_days = 10))), c('0 days', adult((f) => (f.leave.annual_days = 0))), c('14 days', adult((f) => (f.leave.annual_days = 14)))],
    unknown: [c('not stated', adult((f) => (f.leave.annual_days = null)))],
  },
  G11_FIXED_TERM: {
    pass: [
      c('1 year', adult((f) => (f.term = { kind: 'fixed', start: '2026-01-01', end: '2026-12-31', extension_months: null }))),
      c('6 months', adult((f) => (f.term = { kind: 'fixed', start: '2026-06-01', end: '2026-12-01', extension_months: null }))),
      c('1 year + 6 months extension', adult((f) => (f.term = { kind: 'fixed', start: '2026-01-01', end: '2027-01-01', extension_months: 6 }))),
    ],
    fail: [
      c('3 years', adult((f) => (f.term = { kind: 'fixed', start: '2026-01-01', end: '2029-01-01', extension_months: null }))),
      c('2 years + 6 months', adult((f) => (f.term = { kind: 'fixed', start: '2025-01-01', end: '2027-01-01', extension_months: 6 }))),
      c('25 months', adult((f) => (f.term = { kind: 'fixed', start: '2025-01-01', end: '2027-02-01', extension_months: null }))),
    ],
    unknown: [c('kind not stated', adult((f) => (f.term.kind = null)))],
  },
  G12_INTERN_APPRENTICE_PAY: {
    pass: [
      c('intern at 1.2m a month', adult((f) => (f.doc_type = 'internship'))),
      c('intern at 7,000 an hour', minor((f) => (f.doc_type = 'internship'))),
      c('intern at 6,000 an hour in 2027', adult((f) => { f.doc_type = 'internship'; f.pay.amount = 6000; f.pay.unit = 'hour'; }), undefined, '2027-01-01'),
    ],
    fail: [
      c('intern at 500k a month', adult((f) => { f.doc_type = 'internship'; f.pay.amount = 500_000; })),
      c('intern, unpaid', adult((f) => { f.doc_type = 'internship'; f.pay.amount = 0; })),
      c('intern at 5,000 an hour in 2027', adult((f) => { f.doc_type = 'internship'; f.pay.amount = 5000; f.pay.unit = 'hour'; }), undefined, '2027-01-01'),
    ],
    unknown: [c('apprentice: base pay of staff unknown', adult((f) => (f.doc_type = 'apprenticeship')))],
  },
  G13_FLAGGED_CLAUSES: {
    pass: [c('document, nothing flagged', adultDoc()), c('answers: no deductions, ID not kept', adultAnswersFields()), c('only a non-compete (M10 handles it)', adult((f) => (f.flagged_clauses = [{ category: 'non_compete', excerpt: 'x', page: 1 }])))],
    fail: [
      c('fine clause', adult((f) => (f.flagged_clauses = [{ category: 'fine', excerpt: 'хоцорвол 10,000 төгрөгийн торгууль', page: 1 }]))),
      c('ID kept (answer)', answers((f) => (f.id_kept = true))),
      c('money taken (answer)', answers((f) => (f.deductions = true))),
    ],
    unknown: [c('answers: do not know', answers((f) => { f.deductions = null; f.id_kept = null; }))],
  },
  Q01_UNPAID: {
    pass: [c('paid hourly', minorDoc()), c('paid monthly', adultDoc()), c('paid per piece', adult((f) => { f.pay.unit = 'piece'; f.pay.amount = 500; f.hours_per_unit = 0.1; }))],
    fail: [
      c('food and lodging', adult((f) => { f.pay.unit = 'in_kind'; f.pay.amount = null; })),
      c('zero', adult((f) => (f.pay.amount = 0))),
      c('zero, minor', minor((f) => (f.pay.amount = 0))),
    ],
    unknown: [c('amount unknown', adult((f) => (f.pay.amount = null)))],
  },
  Q02_CANNOT_QUIT: {
    pass: [c('can quit', adultDoc()), c('can quit, minor', minorDoc()), c('can quit, answers', adultAnswersFields())],
    fail: [c('cannot quit', adult((f) => (f.can_quit = false))), c('cannot quit, minor', minor((f) => (f.can_quit = false))), c('cannot quit, answers', answers((f) => (f.can_quit = false)))],
    unknown: [c('not answered', adult((f) => (f.can_quit = null)))],
  },
  Q03_INJURED: {
    pass: [c('not injured', adultDoc()), c('not injured, minor', minorDoc()), c('not injured, answers', adultAnswersFields())],
    fail: [c('injured', adult((f) => (f.injured = true))), c('injured, minor', minor((f) => (f.injured = true))), c('injured, answers', answers((f) => (f.injured = true)))],
    unknown: [c('not answered', adult((f) => (f.injured = null)))],
  },
};

// G03 can only be unknown if nothing is known — which is a fail by its own
// definition ("yellow per missing term"), so its "unknown" case is the
// questionnaire, where it is reported as not checked rather than rated.
describe('G03 on the questionnaire', () => {
  it('is listed as not checked, never shown green', () => {
    const rating = rate(adultAnswersFields(), RATED_ON);
    expect(rating.notChecked).toContain('G03_REQUIRED_TERMS');
    expect(rating.results.find((r) => r.id === 'G03_REQUIRED_TERMS')).toBeUndefined();
  });
});

const resultOf = (k: Case, id: string) =>
  rate(k.fields, k.date ?? RATED_ON, k.set ?? ruleSet).results.find((r) => r.id === id);

describe.each(Object.entries(table))('%s', (id, cases) => {
  it('has at least 3 pass, 3 fail and 1 unknown case', () => {
    expect(cases.pass.length).toBeGreaterThanOrEqual(3);
    expect(cases.fail.length).toBeGreaterThanOrEqual(3);
    if (id !== 'G03_REQUIRED_TERMS') expect(cases.unknown.length).toBeGreaterThanOrEqual(1);
  });

  it.each(cases.pass)('passes: $name', (k) => {
    const r = resultOf(k, id);
    expect(r?.status, JSON.stringify(r)).toBe('pass');
    expect(r?.verdict).toBe('green');
  });

  it.each(cases.fail)('fails: $name', (k) => {
    const r = resultOf(k, id);
    expect(r?.status, JSON.stringify(r)).toBe('fail');
    expect(r?.verdict).not.toBe('green');
  });

  it.each(cases.unknown)('unknown: $name', (k) => {
    const r = resultOf(k, id);
    expect(r?.status, JSON.stringify(r)).toBe('unknown');
    expect(r?.verdict).toBe('yellow');
  });
});

it('covers every rule in rules.yaml', () => {
  expect(Object.keys(table).sort()).toEqual(ruleSet.rules.map((r) => r.id).sort());
});

describe('severity overrides from rules.yaml', () => {
  const verdict = (f: ContractFields, id: string, date = RATED_ON) => rate(f, date).results.find((r) => r.id === id)?.verdict;

  it('M02 is red only when the guardian has not signed', () => {
    expect(verdict(minor((f) => (f.signed.guardian = false)), 'M02_THREE_PARTY')).toBe('red');
    expect(verdict(minor((f) => (f.worker.id_copy_attached = false)), 'M02_THREE_PARTY')).toBe('yellow');
  });

  it('G01 is red after 10 business days without a contract, yellow before', () => {
    expect(verdict(answers((f) => { f.written_contract = false; f.term.start = '2026-11-10'; }), 'G01_WRITTEN_CONTRACT')).toBe('red');
    expect(verdict(answers((f) => { f.written_contract = false; f.term.start = '2026-11-12'; }), 'G01_WRITTEN_CONTRACT')).toBe('yellow');
  });

  it('G05 is red when paid less than twice a month, yellow when dates are not fixed', () => {
    expect(verdict(adult((f) => (f.pay.payments_per_month = 1)), 'G05_PAY_FREQUENCY')).toBe('red');
    expect(verdict(adult((f) => (f.pay.fixed_pay_dates = false)), 'G05_PAY_FREQUENCY')).toBe('yellow');
  });

  it('M01 under 13 is P1; 13–14 not on the light-work list is P3', () => {
    const under13 = rate(minor((f) => (f.worker.date_of_birth = '2014-02-01')), RATED_ON);
    expect(under13.results.find((r) => r.id === 'M01_MIN_AGE')?.priority).toBe('P1');
    const fourteen = rate(minor((f) => { f.worker.date_of_birth = '2012-06-01'; f.job_category = 'delivery'; }), RATED_ON, testLists);
    expect(fourteen.results.find((r) => r.id === 'M01_MIN_AGE')?.priority).toBe('P3');
  });
});

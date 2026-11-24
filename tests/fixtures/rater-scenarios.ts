/**
 * Scripted questionnaire scenarios with their expected output (spec, "Edge-case
 * scenarios"). Every person and job here is invented.
 *
 * `rules` lists only the results a scenario is about; `verdict` is the
 * overall one. Rated on 2026-11-24 unless `date` says otherwise.
 */
import type { Answers } from '../../src/lib/rater/questionnaire';
import type { Verdict } from '../../src/lib/rater/verdict';

export type Scenario = {
  name: string;
  answers: Answers;
  date?: string;
  lists?: boolean;
  expect: {
    verdict: Verdict;
    rules?: Record<string, Verdict>;
    priority?: 'P1' | 'P2' | 'P3' | null;
    maxScore?: number;
  };
};

/** A lawful job for a 23-year-old, answered in full. */
export function adultAnswers(): Answers {
  return {
    dob: '2003-04-04',
    category: 'retail',
    employer: 'company',
    written: 'yes',
    contractType: 'employment',
    signedSelf: 'yes',
    signedEmployer: 'yes',
    signedGuardian: 'unknown',
    copy: 'yes',
    start: '2026-03-01',
    daysPerWeek: 5,
    startTime: '09:00',
    endTime: '18:00',
    breakMinutes: 60,
    extra: 'no',
    extraHours: null,
    roster: 'no',
    trips: 'no',
    payAmount: 1_300_000,
    payUnit: 'month',
    hoursPerUnit: null,
    payFrequency: 'twice_month',
    fixedDates: 'yes',
    trial: 'no',
    trialLength: null,
    trialUnit: null,
    trialPaid: null,
    deductions: 'no',
    idKept: 'no',
    canQuit: 'yes',
    injured: 'no',
  };
}

/** A lawful part-time tutoring job for a 16-year-old. */
export function minorAnswers(): Answers {
  return {
    ...adultAnswers(),
    dob: '2010-01-15',
    category: 'tutoring',
    employer: 'organisation',
    signedGuardian: 'yes',
    start: '2026-09-01',
    daysPerWeek: 4,
    startTime: '13:00',
    endTime: '19:00',
    breakMinutes: 60,
    payAmount: 8000,
    payUnit: 'hour',
  };
}

const a = (base: () => Answers, change: Partial<Answers>): Answers => ({ ...base(), ...change });

export const scenarios: Scenario[] = [
  { name: 'lawful adult job', answers: adultAnswers(), expect: { verdict: 'green', priority: null } },
  {
    name: 'lawful minor job: yellow until A/122 is loaded and the paper is seen',
    answers: minorAnswers(),
    expect: { verdict: 'yellow', rules: { M01_MIN_AGE: 'green', M03_MINOR_WEEKLY_HOURS: 'green', M08_PROHIBITED_JOB: 'yellow', M02_THREE_PARTY: 'yellow' } },
  },
  {
    name: 'turning 15 on the start date',
    answers: a(minorAnswers, { dob: '2011-09-01', start: '2026-09-01' }),
    expect: { verdict: 'yellow', rules: { M01_MIN_AGE: 'green' } },
  },
  {
    name: 'one day short of 15 at the start, delivery work',
    answers: a(minorAnswers, { dob: '2011-09-02', start: '2026-09-01', category: 'delivery' }),
    lists: true,
    expect: { verdict: 'red', rules: { M01_MIN_AGE: 'red' }, priority: 'P3' },
  },
  {
    name: '12-year-old',
    answers: a(minorAnswers, { dob: '2014-05-05' }),
    expect: { verdict: 'red', rules: { M01_MIN_AGE: 'red' }, priority: 'P1', maxScore: 10 },
  },
  {
    name: '13-year-old tutoring, guardian signed (light work)',
    answers: a(minorAnswers, { dob: '2013-02-02' }),
    lists: true,
    expect: { verdict: 'yellow', rules: { M01_MIN_AGE: 'green' } },
  },
  {
    name: '29.5 hours a week',
    answers: a(minorAnswers, { daysPerWeek: 5, startTime: '09:00', endTime: '15:54', breakMinutes: 60 }),
    expect: { verdict: 'yellow', rules: { M03_MINOR_WEEKLY_HOURS: 'green' } },
  },
  {
    name: '30.5 hours a week',
    answers: a(minorAnswers, { daysPerWeek: 5, startTime: '09:00', endTime: '16:06', breakMinutes: 60 }),
    expect: { verdict: 'red', rules: { M03_MINOR_WEEKLY_HOURS: 'red' }, priority: 'P2' },
  },
  {
    name: 'a shift ending at 22:30',
    answers: a(minorAnswers, { startTime: '17:30', endTime: '22:30', breakMinutes: 60, daysPerWeek: 3 }),
    expect: { verdict: 'red', rules: { M04_NIGHT_WORK: 'red' }, priority: 'P2' },
  },
  {
    name: 'a shift ending at exactly 22:00',
    answers: a(minorAnswers, { startTime: '16:00', endTime: '22:00', breakMinutes: 60, daysPerWeek: 3 }),
    expect: { verdict: 'yellow', rules: { M04_NIGHT_WORK: 'green' } },
  },
  {
    name: 'a shift past midnight',
    answers: a(minorAnswers, { startTime: '20:00', endTime: '01:00', breakMinutes: 60, daysPerWeek: 2 }),
    expect: { verdict: 'red', rules: { M04_NIGHT_WORK: 'red' } },
  },
  {
    name: 'per-delivery pay that clears the minimum',
    answers: a(adultAnswers, { category: 'delivery', payAmount: 4000, payUnit: 'delivery', hoursPerUnit: 0.5 }),
    expect: { verdict: 'green', rules: { G04_MIN_WAGE: 'green' } },
  },
  {
    name: 'per-delivery pay below the minimum',
    answers: a(adultAnswers, { category: 'delivery', payAmount: 2000, payUnit: 'delivery', hoursPerUnit: 1 }),
    expect: { verdict: 'red', rules: { G04_MIN_WAGE: 'red' }, priority: 'P2' },
  },
  {
    name: 'per-delivery pay, hours not known',
    answers: a(adultAnswers, { category: 'delivery', payAmount: 3000, payUnit: 'delivery', hoursPerUnit: null }),
    expect: { verdict: 'yellow', rules: { G04_MIN_WAGE: 'yellow' } },
  },
  {
    name: 'herding helper paid in food and lodging',
    answers: a(minorAnswers, {
      dob: '2011-03-01',
      category: 'herding_helper',
      employer: 'individual',
      written: 'no',
      start: '2026-06-01',
      daysPerWeek: 7,
      startTime: '06:00',
      endTime: '21:00',
      breakMinutes: 60,
      payAmount: null,
      payUnit: 'in_kind',
      payFrequency: 'unknown',
      fixedDates: 'unknown',
    }),
    expect: {
      verdict: 'red',
      rules: { Q01_UNPAID: 'red', G04_MIN_WAGE: 'red', G01_WRITTEN_CONTRACT: 'red', M02_THREE_PARTY: 'red', M03_MINOR_WEEKLY_HOURS: 'red', G09_REST: 'red' },
      priority: 'P1',
      maxScore: 10,
    },
  },
  {
    name: 'a service contract that is really a job',
    answers: a(adultAnswers, { contractType: 'service' }),
    expect: { verdict: 'yellow', rules: { G02_DISGUISED_JOB: 'yellow' } },
  },
  {
    name: 'no written contract after three weeks',
    answers: a(adultAnswers, { written: 'no', start: '2026-11-02' }),
    expect: { verdict: 'red', rules: { G01_WRITTEN_CONTRACT: 'red' }, priority: 'P2' },
  },
  {
    name: 'no written contract, started this week',
    answers: a(adultAnswers, { written: 'no', start: '2026-11-23' }),
    expect: { verdict: 'yellow', rules: { G01_WRITTEN_CONTRACT: 'yellow' } },
  },
  {
    name: 'paid once a month',
    answers: a(adultAnswers, { payFrequency: 'monthly' }),
    expect: { verdict: 'red', rules: { G05_PAY_FREQUENCY: 'red' }, priority: 'P3' },
  },
  {
    name: 'paid irregularly',
    answers: a(adultAnswers, { payFrequency: 'irregular' }),
    expect: { verdict: 'yellow', rules: { G05_PAY_FREQUENCY: 'yellow' } },
  },
  {
    name: 'paid at the end of the season',
    answers: a(adultAnswers, { payFrequency: 'end_of_season' }),
    expect: { verdict: 'red', rules: { G05_PAY_FREQUENCY: 'red' } },
  },
  {
    name: 'a 4-month trial',
    answers: a(adultAnswers, { trial: 'yes', trialLength: 4, trialUnit: 'months', trialPaid: 'full' }),
    expect: { verdict: 'red', rules: { G06_PROBATION: 'red' } },
  },
  {
    name: 'two unpaid trial weeks',
    answers: a(adultAnswers, { trial: 'yes', trialLength: 2, trialUnit: 'weeks', trialPaid: 'none' }),
    expect: { verdict: 'red', rules: { G06_PROBATION: 'red' } },
  },
  {
    name: 'a one-month trial, fully paid',
    answers: a(adultAnswers, { trial: 'yes', trialLength: 1, trialUnit: 'months', trialPaid: 'full' }),
    expect: { verdict: 'green', rules: { G06_PROBATION: 'green' } },
  },
  {
    name: 'money taken from pay',
    answers: a(adultAnswers, { deductions: 'yes' }),
    expect: { verdict: 'yellow', rules: { G13_FLAGGED_CLAUSES: 'yellow' } },
  },
  {
    name: 'the employer keeps the ID card',
    answers: a(adultAnswers, { idKept: 'yes' }),
    expect: { verdict: 'yellow', rules: { G13_FLAGGED_CLAUSES: 'yellow' } },
  },
  {
    name: 'cannot quit',
    answers: a(adultAnswers, { canQuit: 'no' }),
    expect: { verdict: 'red', rules: { Q02_CANNOT_QUIT: 'red' }, priority: 'P1', maxScore: 10 },
  },
  {
    name: 'injured at work',
    answers: a(adultAnswers, { injured: 'yes' }),
    expect: { verdict: 'red', rules: { Q03_INJURED: 'red' }, priority: 'P1', maxScore: 10 },
  },
  {
    name: 'minor doing 3 extra hours a week',
    answers: a(minorAnswers, { extra: 'yes', extraHours: 3 }),
    expect: { verdict: 'red', rules: { M05_MINOR_OVERTIME: 'red', M03_MINOR_WEEKLY_HOURS: 'green' } },
  },
  {
    name: 'minor whose extra hours push the week over 30',
    answers: a(minorAnswers, { extra: 'yes', extraHours: 12 }),
    expect: { verdict: 'red', rules: { M03_MINOR_WEEKLY_HOURS: 'red', M05_MINOR_OVERTIME: 'red' }, priority: 'P2' },
  },
  {
    name: 'minor on rotating shifts away from home',
    answers: a(minorAnswers, { roster: 'yes' }),
    expect: { verdict: 'red', rules: { M06_ROSTER_WORK: 'red' } },
  },
  {
    name: 'minor sent on work trips (shop)',
    answers: a(minorAnswers, { category: 'retail', trips: 'yes' }),
    expect: { verdict: 'red', rules: { M07_BUSINESS_TRIPS: 'red' } },
  },
  {
    name: 'minor on trips for a commercial shoot',
    answers: a(minorAnswers, { category: 'arts_sports_ads', trips: 'yes' }),
    expect: { verdict: 'yellow', rules: { M07_BUSINESS_TRIPS: 'green' } },
  },
  {
    name: 'minor hired through a labour agency',
    answers: a(minorAnswers, { employer: 'agency' }),
    expect: { verdict: 'red', rules: { M11_LABOUR_AGENCY: 'red' } },
  },
  {
    name: 'minor in a gold-panning job',
    answers: a(minorAnswers, { category: 'mining' }),
    lists: true,
    expect: { verdict: 'red', rules: { M08_PROHIBITED_JOB: 'red' }, priority: 'P1', maxScore: 10 },
  },
  {
    name: 'adult working six 10-hour days',
    answers: a(adultAnswers, { daysPerWeek: 6, startTime: '08:00', endTime: '19:00', breakMinutes: 60 }),
    expect: { verdict: 'red', rules: { G07_ADULT_HOURS: 'red', G09_REST: 'red' } },
  },
  {
    name: 'adult with a 30-minute lunch',
    answers: a(adultAnswers, { breakMinutes: 30, endTime: '17:30' }),
    expect: { verdict: 'red', rules: { G09_REST: 'red' } },
  },
  {
    name: 'adult doing 20 extra hours a week',
    answers: a(adultAnswers, { extra: 'yes', extraHours: 20 }),
    expect: { verdict: 'red', rules: { G07_ADULT_HOURS: 'red', G08_OVERTIME_NIGHT_PAY: 'yellow' } },
  },
  {
    name: 'an internship paid 500,000 a month',
    answers: a(adultAnswers, { contractType: 'internship', payAmount: 500_000 }),
    expect: { verdict: 'red', rules: { G12_INTERN_APPRENTICE_PAY: 'red', G04_MIN_WAGE: 'red' } },
  },
  {
    name: '5,000 an hour on the last day of 2026',
    answers: a(adultAnswers, { payAmount: 5000, payUnit: 'hour' }),
    date: '2026-12-31',
    expect: { verdict: 'green', rules: { G04_MIN_WAGE: 'green' } },
  },
  {
    name: '5,000 an hour on the first day of 2027',
    answers: a(adultAnswers, { payAmount: 5000, payUnit: 'hour' }),
    date: '2027-01-01',
    expect: { verdict: 'red', rules: { G04_MIN_WAGE: 'red' }, priority: 'P2' },
  },
  {
    name: 'every answer "don\'t know"',
    answers: {
      ...adultAnswers(),
      dob: null,
      category: null,
      employer: 'unknown',
      written: 'unknown',
      contractType: 'unknown',
      signedSelf: 'unknown',
      signedEmployer: 'unknown',
      signedGuardian: 'unknown',
      copy: 'unknown',
      start: null,
      daysPerWeek: null,
      startTime: null,
      endTime: null,
      breakMinutes: null,
      extra: 'unknown',
      roster: 'unknown',
      trips: 'unknown',
      payAmount: null,
      payUnit: null,
      payFrequency: 'unknown',
      fixedDates: 'unknown',
      trial: 'unknown',
      deductions: 'unknown',
      idKept: 'unknown',
      canQuit: 'unknown',
      injured: 'unknown',
    },
    expect: { verdict: 'yellow', priority: null },
  },
];

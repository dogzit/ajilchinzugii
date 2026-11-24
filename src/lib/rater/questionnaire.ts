import { emptyFields, payUnits, type ContractFields } from './fields';

/**
 * The no-contract path: the spec's 15 questions, and how each answer lands
 * in the engine's fields. One question per screen; a screen may hold the
 * parts of one question (Q4 asks about the contract, its type, the
 * signatures, the copy and the start date).
 *
 * "Don't know" is always an answer, and it always maps to null — unknown —
 * which the engine rates yellow, never green.
 */

export type YesNo = 'yes' | 'no' | 'unknown';
export type PayUnit = (typeof payUnits)[number];
export type PayFrequency = 'daily' | 'weekly' | 'twice_month' | 'monthly' | 'end_of_season' | 'irregular' | 'unknown';
export type EmployerAnswer = 'company' | 'individual' | 'organisation' | 'agency' | 'unknown';
export type ContractType = 'employment' | 'service' | 'internship' | 'apprenticeship' | 'unknown';
export type TrialPaid = 'full' | 'partial' | 'none' | 'unknown';

export type Answers = {
  // Q1
  dob: string | null;
  // Q2
  category: string | null;
  // Q3
  employer: EmployerAnswer | null;
  // Q4
  written: YesNo | null;
  contractType: ContractType | null;
  signedSelf: YesNo | null;
  signedEmployer: YesNo | null;
  signedGuardian: YesNo | null;
  copy: YesNo | null;
  start: string | null;
  // Q5
  daysPerWeek: number | null;
  // Q6
  startTime: string | null;
  endTime: string | null;
  breakMinutes: number | null;
  // Q7
  extra: YesNo | null;
  extraHours: number | null;
  // Q8
  roster: YesNo | null;
  trips: YesNo | null;
  // Q9
  payAmount: number | null;
  payUnit: PayUnit | null;
  hoursPerUnit: number | null;
  // Q10
  payFrequency: PayFrequency | null;
  fixedDates: YesNo | null;
  // Q11
  trial: YesNo | null;
  trialLength: number | null;
  trialUnit: 'days' | 'weeks' | 'months' | null;
  trialPaid: TrialPaid | null;
  // Q12–Q15
  deductions: YesNo | null;
  idKept: YesNo | null;
  canQuit: YesNo | null;
  injured: YesNo | null;
};

/** The order of the screens, and which answers each one holds. */
export const QUESTIONS = [
  { id: 'q1', fields: ['dob'] },
  { id: 'q2', fields: ['category'] },
  { id: 'q3', fields: ['employer'] },
  { id: 'q4', fields: ['written', 'contractType', 'signedSelf', 'signedEmployer', 'signedGuardian', 'copy', 'start'] },
  { id: 'q5', fields: ['daysPerWeek'] },
  { id: 'q6', fields: ['startTime', 'endTime', 'breakMinutes'] },
  { id: 'q7', fields: ['extra', 'extraHours'] },
  { id: 'q8', fields: ['roster', 'trips'] },
  { id: 'q9', fields: ['payAmount', 'payUnit', 'hoursPerUnit'] },
  { id: 'q10', fields: ['payFrequency', 'fixedDates'] },
  { id: 'q11', fields: ['trial', 'trialLength', 'trialUnit', 'trialPaid'] },
  { id: 'q12', fields: ['deductions'] },
  { id: 'q13', fields: ['idKept'] },
  { id: 'q14', fields: ['canQuit'] },
  { id: 'q15', fields: ['injured'] },
] as const satisfies readonly { id: string; fields: readonly (keyof Answers)[] }[];

export function emptyAnswers(): Answers {
  return {
    dob: null,
    category: null,
    employer: null,
    written: null,
    contractType: null,
    signedSelf: null,
    signedEmployer: null,
    signedGuardian: null,
    copy: null,
    start: null,
    daysPerWeek: null,
    startTime: null,
    endTime: null,
    breakMinutes: null,
    extra: null,
    extraHours: null,
    roster: null,
    trips: null,
    payAmount: null,
    payUnit: null,
    hoursPerUnit: null,
    payFrequency: null,
    fixedDates: null,
    trial: null,
    trialLength: null,
    trialUnit: null,
    trialPaid: null,
    deductions: null,
    idKept: null,
    canQuit: null,
    injured: null,
  };
}

const yn = (v: YesNo | null): boolean | null => (v === 'yes' ? true : v === 'no' ? false : null);

/** Payments a month for each answer to "How often are you paid?". */
const PAYMENTS_PER_MONTH: Record<PayFrequency, number | null> = {
  daily: 20,
  weekly: 4,
  twice_month: 2,
  monthly: 1,
  end_of_season: 0,
  irregular: null,
  unknown: null,
};

const MONTHS_PER: Record<'days' | 'weeks' | 'months', number> = { days: 1 / 30, weeks: 1 / (52 / 12), months: 1 };

export function answersToFields(a: Answers): ContractFields {
  const f = emptyFields('questionnaire');
  const written = yn(a.written);

  f.worker.date_of_birth = a.dob;
  f.job_category = a.category;

  if (a.employer === 'agency') {
    f.via_labour_agency = true;
  } else if (a.employer === 'company' || a.employer === 'individual' || a.employer === 'organisation') {
    f.employer_kind = a.employer;
    f.via_labour_agency = false;
  }

  f.written_contract = written;
  f.term.start = a.start;
  if (written === false) {
    // No paper: nobody signed it and there is no copy to give.
    f.signed = { employer: false, employee: false, guardian: false, copy_given: false };
  } else {
    f.signed = {
      employer: yn(a.signedEmployer),
      employee: yn(a.signedSelf),
      guardian: yn(a.signedGuardian),
      copy_given: yn(a.copy),
    };
    f.doc_type = a.contractType && a.contractType !== 'unknown' ? a.contractType : null;
  }

  f.schedule.days_per_week = a.daysPerWeek;
  f.schedule.start_time = a.startTime;
  f.schedule.end_time = a.endTime;
  f.schedule.lunch_break_min = a.breakMinutes;
  f.schedule.overtime_allowed = yn(a.extra);
  f.extra_hours_per_week = a.extra === 'no' ? 0 : a.extra === 'yes' ? a.extraHours : null;
  f.schedule.roster_work = yn(a.roster);
  f.schedule.business_trips = yn(a.trips);

  f.pay.unit = a.payUnit;
  f.pay.amount = a.payUnit === 'in_kind' ? null : a.payAmount;
  f.hours_per_unit = a.hoursPerUnit;
  f.pay.payments_per_month = a.payFrequency ? PAYMENTS_PER_MONTH[a.payFrequency] : null;
  f.pay.fixed_pay_dates = a.payFrequency === 'irregular' ? false : yn(a.fixedDates);

  if (a.trial === 'no') {
    f.probation.months = 0;
  } else if (a.trial === 'yes') {
    f.probation.months = a.trialLength !== null && a.trialUnit ? a.trialLength * MONTHS_PER[a.trialUnit] : null;
    f.probation_paid = a.trialPaid && a.trialPaid !== 'unknown' ? a.trialPaid : null;
  }

  f.deductions = yn(a.deductions);
  f.id_kept = yn(a.idKept);
  f.can_quit = yn(a.canQuit);
  f.injured = yn(a.injured);
  return f;
}

import { minutesOf } from './derive';
import { effectiveHourlyPay, weeklyHours } from './derive';
import { ageAtStart, minimumWage } from './engine';
import type { ContractFields } from './fields';
import type { RuleSet } from './rule-set';

/**
 * The corrected contract: built deterministically from the reader's fields,
 * with every unlawful value replaced by the lawful one from rules.yaml. No
 * model is involved, and nothing personal is printed — names, the date of
 * birth and addresses are left as blanks for the reader to fill in by hand.
 */

export type TemplateDoc = {
  title: string;
  note: string;
  sections: { heading: string; lines: string[] }[];
};

/** `t(key, values)` reads `rater.template.<key>` in the reader's language. */
export type Translate = (key: string, values?: Record<string, string | number>) => string;

const param = <T,>(set: RuleSet, id: string, name: string): T => set.rules.find((r) => r.id === id)?.params[name] as T;

const clock = (minutes: number) => {
  const m = ((minutes % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
};

export function buildTemplate(
  f: ContractFields,
  ratingDate: string,
  set: RuleSet,
  t: Translate,
  locale: string,
): TemplateDoc {
  const number = (n: number) => new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(n);
  const blank = t('blank');
  const age = ageAtStart(f, ratingDate);
  // Unknown age gets the minor protections: doubt counts in the worker's favour.
  const minor = age === null || age < 18;

  const minorWeekly = param<number>(set, 'M03_MINOR_WEEKLY_HOURS', 'max_weekly_hours');
  const adultDaily = param<number>(set, 'G07_ADULT_HOURS', 'max_daily_hours');
  const adultWeekly = param<number>(set, 'G07_ADULT_HOURS', 'max_weekly_hours');
  const nightStart = param<string>(set, 'M04_NIGHT_WORK', 'night_start');
  const nightEnd = param<string>(set, 'M04_NIGHT_WORK', 'night_end');
  const minLunch = param<number>(set, 'G09_REST', 'min_lunch_minutes');
  const minRestDays = param<number>(set, 'G09_REST', 'min_rest_days');
  const minBetween = param<number>(set, 'G09_REST', 'min_hours_between_days');
  const minLeave = param<number>(set, 'G10_ANNUAL_LEAVE', 'min_days');
  const maxTrial = param<number>(set, 'G06_PROBATION', 'max_months');
  const noTrialKinds = param<string[]>(set, 'G06_PROBATION', 'no_trial_term_kinds');
  const minPayments = param<number>(set, 'G05_PAY_FREQUENCY', 'min_payments_per_month');
  const overtimeRate = param<number>(set, 'G08_OVERTIME_NIGHT_PAY', 'min_overtime_rate');
  const nightRate = param<number>(set, 'G08_OVERTIME_NIGHT_PAY', 'min_night_rate');
  const medicalMonths = param<number>(set, 'M09_MEDICAL_CHECKS', 'months_between_checks');

  // Hours: what the reader works, cut to the limit.
  const weeklyLimit = minor ? minorWeekly : adultWeekly;
  const days = Math.min(f.schedule.days_per_week ?? 7 - minRestDays, 7 - minRestDays);
  const weekly = Math.min(weeklyHours(f) ?? weeklyLimit, weeklyLimit);
  const daily = Math.min(weekly / Math.max(days, 1), minor ? 24 : adultDaily);
  const lunch = Math.max(f.schedule.lunch_break_min ?? minLunch, minLunch);

  let times: string | null = null;
  if (f.schedule.start_time) {
    const span = Math.round(daily * 60) + lunch;
    let start = minutesOf(f.schedule.start_time);
    if (minor) {
      start = Math.max(start, minutesOf(nightEnd));
      if (start + span > minutesOf(nightStart)) start = minutesOf(nightStart) - span;
    }
    times = t('times', { start: clock(start), end: clock(start + span), lunch });
  }

  // Pay: the reader's own figure if it is lawful, otherwise the minimum.
  const wage = minimumWage(set, ratingDate);
  const hourly = effectiveHourlyPay(f);
  const unit = f.pay.unit;
  const payLine =
    wage && hourly !== null && f.pay.amount !== null && unit && unit !== 'in_kind' && hourly >= wage.hourly
      ? t('payStated', { amount: number(f.pay.amount), unit: t(`units.${unit}`) })
      : wage
        ? t('payMinimum', { hourly: number(Math.ceil(wage.hourly)), monthly: number(wage.monthly) })
        : blank;

  const trialMonths = f.probation.months;
  const trialAllowed = !(f.term.kind && noTrialKinds.includes(f.term.kind)) && f.doc_type !== 'apprenticeship';
  const trialLine =
    trialAllowed && trialMonths ? t('trial', { months: number(Math.min(trialMonths, maxTrial)) }) : t('noTrial');

  const category = set.job_categories.find((c) => c.id === f.job_category);
  const job = category && category.id !== 'other' ? (locale === 'mn' ? category.name_mn : category.name_en) : blank;

  const sections: TemplateDoc['sections'] = [
    {
      heading: t('partiesHeading'),
      lines: [t('employer', { blank }), t('employee', { blank }), ...(minor ? [t('guardian', { blank })] : [])],
    },
    { heading: t('jobHeading'), lines: [t('job', { job }), t('duties', { blank }), t('place', { blank })] },
    { heading: t('termHeading'), lines: [t('start', { start: f.term.start ?? blank })] },
    {
      heading: t('hoursHeading'),
      lines: [
        t('hours', { days, daily: number(daily), weekly: number(weekly) }),
        ...(times ? [times] : []),
        minor ? t('minorLimits', { nightStart, nightEnd }) : t('adultOvertime', { overtime: overtimeRate, night: nightRate }),
      ],
    },
    {
      heading: t('payHeading'),
      lines: [
        payLine,
        t('payFrequency', { payments: Math.max(f.pay.payments_per_month ?? minPayments, minPayments), blank }),
        t('noDeductions'),
      ],
    },
    { heading: t('trialHeading'), lines: [trialLine] },
    {
      heading: t('restHeading'),
      lines: [
        t('rest', { days: Math.max(f.schedule.rest_days_per_week ?? minRestDays, minRestDays), between: minBetween }),
        t('leave', { days: Math.max(f.leave.annual_days ?? minLeave, minLeave) }),
      ],
    },
    ...(minor
      ? [{ heading: t('minorHeading'), lines: [t('medical', { months: medicalMonths }), t('noNonCompete'), t('idCopy')] }]
      : []),
    { heading: t('rightsHeading'), lines: [t('noDocuments'), t('canQuit')] },
    {
      heading: t('signaturesHeading'),
      lines: [
        t('signEmployer', { blank }),
        t('signEmployee', { blank }),
        ...(minor ? [t('signGuardian', { blank })] : []),
        t('copyGiven', { blank }),
      ],
    },
  ];

  return { title: t('docTitle'), note: t('note'), sections };
}

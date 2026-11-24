// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { rate, type Rating } from '../../src/lib/rater/engine';
import { answersToFields, emptyAnswers, type Answers } from '../../src/lib/rater/questionnaire';
import { rateRequest, ratingRequestSchema } from '../../src/lib/rater/request';
import { adultDoc, make, minorDoc } from '../fixtures/rater';

/**
 * False greens found by the independent review before release. Each test is
 * one reported case: the input that was rated too kindly, and what it must
 * be rated instead. Doubt is never green.
 */
const verdictOf = (rating: Rating, id: string) => rating.results.find((r) => r.id === id)?.verdict;

function minorAnswers(change: Partial<Answers> = {}): Answers {
  return {
    ...emptyAnswers(),
    dob: '2010-03-14', category: 'cafe_restaurant', employer: 'company', written: 'yes', contractType: 'employment',
    signedSelf: 'yes', signedEmployer: 'yes', signedGuardian: 'yes', copy: 'yes', start: '2026-09-01',
    daysPerWeek: 5, startTime: '09:00', endTime: '15:00', breakMinutes: 0, extra: 'no',
    roster: 'no', trips: 'no', payAmount: 7000, payUnit: 'hour', payFrequency: 'twice_month', fixedDates: 'yes',
    trial: 'no', deductions: 'no', idKept: 'no', canQuit: 'yes', injured: 'no',
    ...change,
  } as Answers;
}
const adultAnswers = (change: Partial<Answers> = {}) =>
  minorAnswers({ dob: '2004-05-01', startTime: '09:00', endTime: '18:00', breakMinutes: 60, ...change });

describe('review: false greens', () => {
  it('overtime written as a percentage is converted before it is compared', () => {
    const f = make(adultDoc, (f) => {
      f.schedule.overtime_allowed = true;
      f.schedule.start_time = '14:00';
      f.schedule.end_time = '23:00';
      f.pay.overtime_rate = 120; // "120%" of the base: 1.2×
      f.pay.night_rate = 10; // "10% нэмэгдэл": 1.1×
    });
    expect(verdictOf(rate(f, '2026-11-24'), 'G08_OVERTIME_NIGHT_PAY')).toBe('red');
    const fair = make(adultDoc, (f) => {
      f.schedule.overtime_allowed = true;
      f.pay.overtime_rate = 150;
      f.pay.night_rate = 1.2;
    });
    expect(verdictOf(rate(fair, '2026-11-24'), 'G08_OVERTIME_NIGHT_PAY')).not.toBe('red');
  });

  it('overtime of an unknown amount is not zero', () => {
    const atLimit = rate(answersToFields(minorAnswers({ extra: 'yes', extraHours: null })), '2026-11-24');
    expect(verdictOf(atLimit, 'M03_MINOR_WEEKLY_HOURS')).toBe('red');
    expect(atLimit.priority).toBe('P2');
    const adult = rate(answersToFields(adultAnswers({ payAmount: 1_050_000, payUnit: 'month', extra: 'yes', extraHours: null })), '2027-01-05');
    expect(verdictOf(adult, 'G04_MIN_WAGE')).toBe('yellow');
  });

  it('day pay is spread over the extra hours too', () => {
    const rating = rate(answersToFields(adultAnswers({ payAmount: 40_000, payUnit: 'day', extra: 'yes', extraHours: 10 })), '2026-11-24');
    expect(verdictOf(rating, 'G04_MIN_WAGE')).toBe('red');
  });

  it('a schedule that breaks the law at any age stays red when the age is unknown', () => {
    const f = make(adultDoc, (f) => {
      f.worker.date_of_birth = null;
      f.schedule = { ...f.schedule, start_time: '07:00', end_time: '19:00', lunch_break_min: 60, hours_per_day: null, hours_per_week: null, days_per_week: 5 };
    });
    expect(rate(f, '2026-11-24').verdict).toBe('red');
  });

  it('checks the 4-hour daily overtime limit', () => {
    const f = make(adultDoc, (f) => {
      f.schedule.hours_per_day = 7;
      f.schedule.hours_per_week = 35;
      f.schedule.start_time = '09:00';
      f.schedule.end_time = '17:00';
      f.extra_hours_per_week = 21;
    });
    expect(verdictOf(rate(f, '2026-11-24'), 'G07_ADULT_HOURS')).toBe('red');
  });

  it('does not compare a monthly trial pay with a daily rate', () => {
    const f = make(adultDoc, (f) => {
      f.pay.amount = 40_000;
      f.pay.unit = 'day';
      f.probation = { months: 2, extension_months: null, pay_amount: 600_000 };
    });
    expect(verdictOf(rate(f, '2026-11-24'), 'G06_PROBATION')).toBe('yellow');
  });

  it('exactly the monthly minimum for a full week passes, either side of the new year', () => {
    expect(verdictOf(rate(make(adultDoc, (f) => { f.pay.amount = 792_000; f.pay.unit = 'month'; }), '2026-12-31'), 'G04_MIN_WAGE')).toBe('green');
    expect(verdictOf(rate(make(adultDoc, (f) => { f.pay.amount = 1_000_000; f.pay.unit = 'month'; }), '2027-01-01'), 'G04_MIN_WAGE')).toBe('green');
    expect(verdictOf(rate(make(adultDoc, (f) => { f.pay.amount = 792_000; f.pay.unit = 'month'; }), '2027-01-01'), 'G04_MIN_WAGE')).toBe('red');
  });

  it('zero working days is unknown, not zero hours', () => {
    const rating = rate(answersToFields(minorAnswers({ daysPerWeek: 0, startTime: '09:00', endTime: '21:00' })), '2026-11-24');
    expect(verdictOf(rating, 'M03_MINOR_WEEKLY_HOURS')).not.toBe('green');
  });

  it('an unknown employer kind leaves the hours and pay-date terms unknown', () => {
    const f = make(adultDoc, (f) => {
      f.employer_kind = null;
      f.pay.fixed_pay_dates = null;
    });
    expect(verdictOf(rate(f, '2026-11-24'), 'G03_REQUIRED_TERMS')).toBe('yellow');
  });

  it('a clause the model named but could not quote turns M10 and G13 unknown, not green', () => {
    const f = make(minorDoc, (f) => {
      f.flagged_clauses = [
        { category: 'non_compete', excerpt: '', page: 1, unverified: true },
        { category: 'fine', excerpt: '', page: 1, unverified: true },
      ];
    });
    const rating = rate(f, '2026-11-24');
    expect(verdictOf(rating, 'M10_NON_COMPETE')).toBe('yellow');
    expect(verdictOf(rating, 'G13_FLAGGED_CLAUSES')).toBe('yellow');
  });

  it('questionnaire answers sent as a "document" do not earn the AI-checked greens', () => {
    const fields = { ...answersToFields(minorAnswers({ deductions: 'yes' })), source: 'document' as const };
    const rating = rateRequest({ fields }, '2026-11-24');
    expect(verdictOf(rating, 'G13_FLAGGED_CLAUSES')).toBe('yellow');
    expect(verdictOf(rating, 'M10_NON_COMPETE')).toBe('yellow');
  });
});

describe('review: what reaches the statistics', () => {
  it('refuses a job category that is not one of the rule set ids', () => {
    expect(ratingRequestSchema.safeParse({ fields: { ...minorDoc(), job_category: 'Батболд, УБ01234567, 99112233' } }).success).toBe(false);
    expect(ratingRequestSchema.safeParse({ fields: minorDoc() }).success).toBe(true);
  });
});

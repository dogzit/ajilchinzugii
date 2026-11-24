import type { ContractFields } from './fields';

/**
 * Values the spec says code computes, never the model: age at start, hours,
 * night overlap, effective hourly pay, contract length. Pure functions of the
 * fields; every unknown input gives null, never a guess that could pass.
 *
 * Where two stated values disagree (a contract that says "8 hours a day" and
 * "09:00–19:00"), the larger number of hours is used: doubt counts in the
 * worker's favour, and more hours is what a limit is checked against.
 */

const DAY = 24 * 60;

export const toUtc = (iso: string): number => Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10));

/** Whole years between a birth date and a day; a birthday counts on the day itself. */
export function ageOn(dateOfBirth: string, on: string): number {
  const [by, bm, bd] = dateOfBirth.split('-').map(Number) as [number, number, number];
  const [y, m, d] = on.split('-').map(Number) as [number, number, number];
  return y - by - (m < bm || (m === bm && d < bd) ? 1 : 0);
}

export const minutesOf = (hhmm: string): number => {
  const [h, m] = hhmm.split(':').map(Number) as [number, number];
  return h * 60 + m;
};

/** Length of a shift in minutes, including one that ends after midnight. */
export function shiftMinutes(start: string | null, end: string | null): number | null {
  if (!start || !end) return null;
  const s = minutesOf(start);
  let e = minutesOf(end);
  if (e === s) return null; // "09:00–09:00" is not a shift we can read
  if (e < s) e += DAY;
  return e - s;
}

/**
 * Minutes of a shift that fall inside the night window (22:00–06:00 by
 * default). A shift ending after midnight is laid out on a timeline, and
 * three night windows — the one before, the one that day and the next —
 * cover every way it can overlap.
 */
export function nightOverlapMinutes(
  start: string,
  end: string,
  nightStart = '22:00',
  nightEnd = '06:00',
): number {
  const s = minutesOf(start);
  const length = shiftMinutes(start, end);
  if (length === null) return 0;
  const e = s + length;
  const ns = minutesOf(nightStart);
  const ne = minutesOf(nightEnd) + (minutesOf(nightEnd) <= ns ? DAY : 0);

  let total = 0;
  for (const k of [-1, 0, 1]) {
    const from = Math.max(s, ns + k * DAY);
    const to = Math.min(e, ne + k * DAY);
    if (to > from) total += to - from;
  }
  return total;
}

const largest = (...values: (number | null | undefined)[]): number | null => {
  const known = values.filter((v): v is number => typeof v === 'number' && Number.isFinite(v));
  return known.length ? Math.max(...known) : null;
};

/** Ordinary working hours in a day: the stated figure or the shift less its break, whichever is larger. */
export function dailyHours(f: ContractFields): number | null {
  const span = shiftMinutes(f.schedule.start_time, f.schedule.end_time);
  const fromTimes = span === null ? null : (span - Math.min(f.schedule.lunch_break_min ?? 0, span)) / 60;
  return largest(f.schedule.hours_per_day, fromTimes);
}

/** Days worked a week; 0 is not an answer anyone works by, so it counts as unknown. */
const workDays = (f: ContractFields) => (f.schedule.days_per_week ? f.schedule.days_per_week : null);

/** Ordinary hours in a week: stated, or daily × days, whichever is larger. */
export function weeklyHours(f: ContractFields): number | null {
  const daily = dailyHours(f);
  const days = workDays(f);
  return largest(f.schedule.hours_per_week, daily !== null && days !== null ? daily * days : null);
}

/**
 * Ordinary hours plus the extra hours the worker actually does. When there
 * is overtime but nobody knows how much, the total is unknown — never the
 * ordinary hours alone, which would understate it.
 */
export function totalWeeklyHours(f: ContractFields): number | null {
  const weekly = weeklyHours(f);
  if (weekly === null) return null;
  if (f.extra_hours_per_week === null && f.schedule.overtime_allowed === true) return null;
  return weekly + (f.extra_hours_per_week ?? 0);
}

/**
 * An overtime or night rate as a multiplier. Contracts write it three ways:
 * "1.5 дахин" (1.5), "150%" of the base (150), or "50% нэмэгдэл" on top of
 * it (50). Up to 3 is a multiplier, 100 or more a total percentage, anything
 * between an extra percentage.
 */
export function rateMultiplier(value: number | null): number | null {
  if (value === null) return null;
  if (value <= 3) return value;
  if (value >= 100) return value / 100;
  return 1 + value / 100;
}

const WEEKS_PER_MONTH = 52 / 12;

/** Days between two ISO dates (end exclusive). */
export const daysBetween = (start: string, end: string): number =>
  Math.round((toUtc(end) - toUtc(start)) / 86_400_000);

/**
 * Pay per hour in tögrög, from the amount and its unit as written. Unit
 * conversion is code's job (spec): the model copies "450,000 a month" and
 * this works out what an hour of that is worth.
 *
 * In-kind pay (food, lodging) is no money pay at all: 0.
 */
export function effectiveHourlyPay(f: ContractFields): number | null {
  const { amount, unit } = f.pay;
  if (unit === 'in_kind') return 0;
  if (amount === null || unit === null) return null;

  switch (unit) {
    case 'hour':
      return amount;
    case 'day': {
      // A week's pay over a week's hours, extra hours included, when both
      // are known; otherwise one day's pay over one day's hours.
      const days = workDays(f);
      const total = totalWeeklyHours(f);
      if (days && total) return (amount * days) / total;
      if (f.schedule.overtime_allowed === true && f.extra_hours_per_week === null) return null;
      const daily = dailyHours(f);
      return daily ? amount / daily : null;
    }
    case 'month': {
      const weekly = totalWeeklyHours(f);
      return weekly ? amount / (weekly * WEEKS_PER_MONTH) : null;
    }
    case 'piece':
    case 'delivery':
      return f.hours_per_unit ? amount / f.hours_per_unit : null;
    case 'season': {
      const weekly = totalWeeklyHours(f);
      const { start, end } = f.term;
      if (!weekly || !start || !end) return null;
      const weeks = daysBetween(start, end) / 7;
      return weeks > 0 ? amount / (weekly * weeks) : null;
    }
  }
}

/** Total contract length in months, extensions included. */
export function contractMonths(f: ContractFields): number | null {
  const { start, end, extension_months } = f.term;
  if (!start || !end) return null;
  return daysBetween(start, end) / (365.25 / 12) + (extension_months ?? 0);
}

/** Working days (Monday–Friday) from `start` up to, not including, `end`. */
export function businessDaysBetween(start: string, end: string): number {
  let count = 0;
  for (let t = toUtc(start); t < toUtc(end); t += 86_400_000) {
    const day = new Date(t).getUTCDay();
    if (day !== 0 && day !== 6) count += 1;
  }
  return count;
}

export type AgeBand = 'under_13' | '13_14' | '15_17' | '18_24' | '25_plus' | 'unknown';

export function ageBand(age: number | null): AgeBand {
  if (age === null) return 'unknown';
  if (age < 13) return 'under_13';
  if (age < 15) return '13_14';
  if (age < 18) return '15_17';
  if (age < 25) return '18_24';
  return '25_plus';
}

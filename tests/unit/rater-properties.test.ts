import { describe, expect, it } from 'vitest';
import { rate } from '../../src/lib/rater/engine';
import { emptyFields, flaggedCategories, payUnits, type ContractFields } from '../../src/lib/rater/fields';
import { answersToFields, emptyAnswers } from '../../src/lib/rater/questionnaire';
import { ruleSet } from '../../src/lib/rater/rule-set';
import { scoreStops } from '../../src/lib/score-color';
import { adultDoc, minorDoc, testLists } from '../fixtures/rater';

/**
 * Properties that must hold for every input, checked on thousands of random
 * contracts from a fixed seed (so a failure reproduces):
 *
 *   - a red verdict never scores 40 or more, and never gets a green colour;
 *   - the score always sits in its verdict's band; P1 is red and ≤ 10;
 *   - an unknown result is always yellow — unknown is never green;
 *   - with nothing known, nothing is green.
 */

function prng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function randomFields(rand: () => number): ContractFields {
  const pick = <T,>(items: readonly T[]): T => items[Math.floor(rand() * items.length)] as T;
  const maybe = <T,>(value: T): T | null => (rand() < 0.3 ? null : value);
  const bool = () => maybe(rand() < 0.5);
  const time = () => maybe(`${String(Math.floor(rand() * 24)).padStart(2, '0')}:${pick(['00', '15', '30', '45'])}`);
  const date = (from: number, span: number) => {
    const d = new Date(Date.UTC(from, 0, 1) + Math.floor(rand() * span) * 86_400_000);
    return d.toISOString().slice(0, 10);
  };

  const f = emptyFields(rand() < 0.5 ? 'document' : 'questionnaire');
  f.doc_type = maybe(pick(['employment', 'service', 'internship', 'apprenticeship', 'other'] as const));
  f.signed = { employer: bool(), employee: bool(), guardian: bool(), copy_given: bool() };
  f.worker = { date_of_birth: maybe(date(2000, 365 * 16)), id_copy_attached: bool() };
  f.employer_kind = maybe(pick(['company', 'individual', 'organisation'] as const));
  f.job = { title: maybe('x'), duties_listed: bool(), location_listed: bool(), tasks: [] };
  f.term = { kind: maybe(pick(['indefinite', 'fixed', 'seasonal', 'replacement'] as const)), start: maybe(date(2025, 700)), end: maybe(date(2026, 1200)), extension_months: maybe(Math.floor(rand() * 12)) };
  f.probation = { months: maybe(Math.floor(rand() * 6)), extension_months: maybe(Math.floor(rand() * 5)), pay_amount: maybe(Math.floor(rand() * 2_000_000)) };
  f.schedule = {
    hours_per_day: maybe(Math.floor(rand() * 14)),
    days_per_week: maybe(Math.floor(rand() * 8)),
    hours_per_week: maybe(Math.floor(rand() * 80)),
    start_time: time(),
    end_time: time(),
    overtime_allowed: bool(),
    roster_work: bool(),
    business_trips: bool(),
    lunch_break_min: maybe(Math.floor(rand() * 120)),
    rest_days_per_week: maybe(Math.floor(rand() * 4)),
  };
  f.pay = {
    amount: maybe(Math.floor(rand() * 2_500_000)),
    unit: maybe(pick(payUnits)),
    payments_per_month: maybe(Math.floor(rand() * 5)),
    fixed_pay_dates: bool(),
    overtime_rate: maybe(1 + Math.floor(rand() * 10) / 10),
    night_rate: maybe(1 + Math.floor(rand() * 5) / 10),
  };
  f.leave = { annual_days: maybe(Math.floor(rand() * 25)) };
  f.medical_checks = bool();
  f.via_labour_agency = bool();
  f.flagged_clauses = rand() < 0.3 ? [{ category: pick(flaggedCategories), excerpt: 'x', page: 1 }] : [];
  f.job_category = maybe(pick(ruleSet.job_categories).id);
  f.written_contract = bool();
  f.hours_per_unit = maybe(rand() * 3);
  f.probation_paid = maybe(pick(['full', 'partial', 'none'] as const));
  f.extra_hours_per_week = maybe(Math.floor(rand() * 20));
  f.deductions = bool();
  f.id_kept = bool();
  f.can_quit = bool();
  f.injured = bool();
  return f;
}

/** A lawful contract with a few parts swapped for random ones — reaches green, and the edges near it. */
function perturbed(rand: () => number): ContractFields {
  const f = rand() < 0.5 ? adultDoc() : minorDoc();
  const other = randomFields(rand);
  const keys = ['signed', 'worker', 'term', 'probation', 'schedule', 'pay', 'leave', 'medical_checks', 'flagged_clauses', 'extra_hours_per_week', 'can_quit', 'injured'] as const;
  for (const key of keys) if (rand() < 0.08) (f as Record<string, unknown>)[key] = other[key];
  return f;
}

const RUNS = 3000;
const rand = prng(20261124);
const ratings = Array.from({ length: RUNS }, (_, i) => {
  const f = i % 2 ? randomFields(rand) : perturbed(rand);
  const date = rand() < 0.5 ? '2026-12-31' : '2027-01-01';
  return rate(f, date, rand() < 0.5 ? ruleSet : testLists);
});

describe('score invariants', () => {
  it('a red verdict never scores 40 or more, and never takes a green colour', () => {
    for (const r of ratings.filter((x) => x.verdict === 'red')) {
      expect(r.score).toBeLessThan(40);
      expect(scoreStops(r.score).slice(0, 2)).toEqual(['red', 'amber']);
    }
  });

  it('the score sits in the band of its verdict', () => {
    for (const r of ratings) {
      const band = ruleSet.score.bands[r.verdict];
      expect(r.score).toBeGreaterThanOrEqual(r.verdict === 'red' && r.p1 ? 1 : band.min);
      expect(r.score).toBeLessThanOrEqual(band.max);
    }
  });

  it('P1 means red and 10 or less', () => {
    for (const r of ratings.filter((x) => x.p1)) {
      expect(r.verdict).toBe('red');
      expect(r.score).toBeLessThanOrEqual(10);
      expect(r.priority).toBe('P1');
    }
  });

  it('all green is 100', () => {
    for (const r of ratings.filter((x) => x.verdict === 'green')) expect(r.score).toBe(100);
  });

  it('the random inputs reach every verdict (the properties are not vacuous)', () => {
    const seen = new Set(ratings.map((r) => r.verdict));
    expect(seen).toEqual(new Set(['red', 'yellow', 'green']));
    expect(ratings.some((r) => r.p1)).toBe(true);
  });
});

describe('unknown is never green', () => {
  it('every unknown result is yellow', () => {
    for (const r of ratings) {
      for (const result of r.results.filter((x) => x.status === 'unknown')) expect(result.verdict).toBe('yellow');
    }
  });

  it('only a pass is green', () => {
    for (const r of ratings) {
      for (const result of r.results.filter((x) => x.verdict === 'green')) expect(result.status).toBe('pass');
    }
  });

  it('an unanswered questionnaire has no green result at all', () => {
    const r = rate(answersToFields(emptyAnswers()), '2026-11-24');
    expect(r.results.length).toBeGreaterThan(10);
    expect(r.results.filter((x) => x.verdict === 'green')).toEqual([]);
    expect(r.verdict).toBe('yellow');
  });

  it('an empty document is green only where the model looked and found no clause', () => {
    const r = rate(emptyFields('document'), '2026-11-24');
    for (const result of r.results.filter((x) => x.verdict === 'green')) {
      expect(result.aiJudgment, result.id).toBe(true);
    }
  });
});

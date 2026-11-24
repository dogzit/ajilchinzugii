import { describe, expect, it } from 'vitest';
import { rate } from '../../src/lib/rater/engine';
import { answersToFields } from '../../src/lib/rater/questionnaire';
import { ruleSet } from '../../src/lib/rater/rule-set';
import { RATED_ON, testLists } from '../fixtures/rater';
import { adultAnswers, scenarios } from '../fixtures/rater-scenarios';

/**
 * The scripted questionnaire scenarios, end to end: answers → fields →
 * engine → verdict, per-rule results, priority and score.
 */

const run = (s: (typeof scenarios)[number]) =>
  rate(answersToFields(s.answers), s.date ?? RATED_ON, s.lists ? testLists : ruleSet);

it('has at least 30 scenarios', () => {
  expect(scenarios.length).toBeGreaterThanOrEqual(30);
});

describe.each(scenarios)('$name', (s) => {
  const rating = run(s);

  it(`is ${s.expect.verdict}`, () => {
    expect(rating.verdict, rating.results.map((r) => `${r.id}:${r.verdict}`).join(' ')).toBe(s.expect.verdict);
  });

  if (s.expect.rules) {
    it.each(Object.entries(s.expect.rules))('%s is %s', (id, verdict) => {
      expect(rating.results.find((r) => r.id === id)?.verdict).toBe(verdict);
    });
  }

  if (s.expect.priority !== undefined) {
    it(`escalates as ${s.expect.priority ?? 'nothing'}`, () => {
      expect(rating.priority).toBe(s.expect.priority);
    });
  }

  if (s.expect.maxScore !== undefined) {
    it(`scores ${s.expect.maxScore} or less`, () => {
      expect(rating.score).toBeLessThanOrEqual(s.expect.maxScore!);
    });
  }
});

describe('the minimum-wage date switch', () => {
  const at = (date: string, change: Partial<ReturnType<typeof adultAnswers>>) =>
    rate(answersToFields({ ...adultAnswers(), ...change }), date).results.find((r) => r.id === 'G04_MIN_WAGE');

  it('uses 792,000 a month on 2026-12-31 and 1,000,000 from 2027-01-01', () => {
    expect(at('2026-12-31', { payAmount: 5000, payUnit: 'hour' })?.details).toContainEqual({
      key: 'minimumHourly',
      values: { pay: Math.round(792_000 / 168), monthly: 792_000 },
    });
    expect(at('2027-01-01', { payAmount: 5000, payUnit: 'hour' })?.details).toContainEqual({
      key: 'minimumHourly',
      values: { pay: Math.round(1_000_000 / 168), monthly: 1_000_000 },
    });
  });

  it.each([
    ['5,000 an hour', { payAmount: 5000, payUnit: 'hour' as const }],
    ['900,000 a month for 40 hours', { payAmount: 900_000, payUnit: 'month' as const }],
    ['45,000 for an 8-hour day', { payAmount: 45_000, payUnit: 'day' as const }],
  ])('the same contract (%s) passes on 2026-12-31 and fails on 2027-01-01', (_, change) => {
    expect(at('2026-12-31', change)?.verdict).toBe('green');
    expect(at('2027-01-01', change)?.verdict).toBe('red');
  });
});

describe('the questionnaire mapping', () => {
  it('turns "don\'t know" into unknown, never into a value', () => {
    const f = answersToFields({ ...adultAnswers(), roster: 'unknown', canQuit: 'unknown', written: 'unknown' });
    expect(f.schedule.roster_work).toBeNull();
    expect(f.can_quit).toBeNull();
    expect(f.written_contract).toBeNull();
  });

  it('treats "no written contract" as nothing signed and no copy', () => {
    const f = answersToFields({ ...adultAnswers(), written: 'no' });
    expect(f.signed).toEqual({ employer: false, employee: false, guardian: false, copy_given: false });
  });

  it('keeps in-kind pay as no money amount', () => {
    const f = answersToFields({ ...adultAnswers(), payUnit: 'in_kind', payAmount: 50_000 });
    expect(f.pay.amount).toBeNull();
    expect(f.pay.unit).toBe('in_kind');
  });
});

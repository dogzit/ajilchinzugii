// @vitest-environment node
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';
import compiled from '../../src/lib/rater/rules.generated.json';
import { evaluate } from '../../src/lib/rater/engine';
import { ruleSet, ruleSetSchema } from '../../src/lib/rater/rule-set';
import { adultDoc, minorDoc, RATED_ON } from '../fixtures/rater';

/**
 * rules.yaml is the source; the app imports rules.generated.json. This fails
 * while they disagree (run `pnpm rules:compile`), and holds the rule set to
 * the spec's rule list.
 */

const yamlSource = parse(readFileSync(resolve(process.cwd(), 'src/lib/rater/rules.yaml'), 'utf8'));

describe('rules.yaml', () => {
  it('is what the app imports (run pnpm rules:compile after editing it)', () => {
    expect(compiled).toEqual(yamlSource);
  });

  it('matches its schema', () => {
    expect(() => ruleSetSchema.parse(yamlSource)).not.toThrow();
  });

  it('has every rule in the spec, plus the two P1 answer rules', () => {
    const spec = [
      ...Array.from({ length: 11 }, (_, i) => `M${String(i + 1).padStart(2, '0')}`),
      ...Array.from({ length: 13 }, (_, i) => `G${String(i + 1).padStart(2, '0')}`),
      'Q01',
      'Q02',
      'Q03',
    ];
    expect(ruleSet.rules.map((r) => r.id.slice(0, 3))).toEqual(spec);
  });

  it('has unique ids', () => {
    const ids = ruleSet.rules.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('marks every rule as not yet lawyer-verified (only a lawyer may change that)', () => {
    for (const rule of ruleSet.rules) expect(rule.lawyer_verified, rule.id).toBe(false);
  });

  it('weighs unknown less than fail for every rule', () => {
    for (const rule of ruleSet.rules) expect(rule.score_weight.unknown).toBeLessThan(rule.score_weight.fail);
  });

  it('has the minimum wage change on 1 January 2027, on a 168-hour basis', () => {
    const g04 = ruleSet.rules.find((r) => r.id === 'G04_MIN_WAGE');
    expect(g04?.params).toEqual({
      wages: [
        { monthly_mnt: 792000, effective_from: null, effective_to: '2026-12-31' },
        { monthly_mnt: 1000000, effective_from: '2027-01-01', effective_to: null },
      ],
      hourly_basis_hours: 168,
    });
  });

  it('keeps A/122 and the light-work list as marked placeholders until they arrive', () => {
    expect(ruleSet.lists_status).toBe('[ХҮЛЭЭГДЭЖ БУЙ / TBD]');
    expect(ruleSet.a122_prohibited).toEqual([]);
    expect(ruleSet.light_work).toEqual([]);
  });

  it('has valid parameters for every evaluator (each one runs)', () => {
    expect(() => evaluate(minorDoc(), RATED_ON)).not.toThrow();
    expect(() => evaluate(adultDoc(), RATED_ON)).not.toThrow();
  });
});

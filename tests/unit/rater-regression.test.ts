import { describe, expect, it } from 'vitest';
import { rate } from '../../src/lib/rater/engine';
import { answersToFields } from '../../src/lib/rater/questionnaire';
import { ruleSet } from '../../src/lib/rater/rule-set';
import { RATED_ON, testLists } from '../fixtures/rater';
import { scenarios } from '../fixtures/rater-scenarios';

/**
 * The regression suite: every scenario's full output, held in a snapshot.
 * Any change to rules.yaml or the engine that moves a single verdict, score
 * or priority shows up here as a diff to review — update it deliberately
 * with `pnpm vitest run tests/unit/rater-regression.test.ts -u`, never to get
 * a pass.
 *
 * The ship gate rides on top: no scenario expected to be red may ever come
 * out green (zero false greens).
 */

const outputs = scenarios.map((s) => {
  const r = rate(answersToFields(s.answers), s.date ?? RATED_ON, s.lists ? testLists : ruleSet);
  return {
    name: s.name,
    verdict: r.verdict,
    score: r.score,
    priority: r.priority,
    results: Object.fromEntries(r.results.map((x) => [x.id, `${x.verdict}/${x.status}`])),
  };
});

describe('regression', () => {
  it('zero false greens: nothing expected red or yellow comes out green', () => {
    const falseGreens = scenarios
      .map((s, i) => ({ s, out: outputs[i]! }))
      .filter(({ s, out }) => s.expect.verdict !== 'green' && out.verdict === 'green')
      .map(({ s }) => s.name);
    expect(falseGreens).toEqual([]);
  });

  it('every scenario rates exactly as recorded', () => {
    expect({ ruleSetVersion: ruleSet.version, outputs }).toMatchSnapshot();
  });
});

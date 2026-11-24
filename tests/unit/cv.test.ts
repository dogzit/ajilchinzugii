// @vitest-environment node
import { readFileSync } from 'node:fs';
import { parse } from 'yaml';
import { afterEach, describe, expect, it, vi } from 'vitest';
import compiled from '../../src/lib/cv/cv-rules.generated.json';
import { POST as cvPOST } from '../../src/app/api/cv/check/route';
import { rateCv, type CvInput, type CvProfile } from '../../src/lib/cv/engine';
import { checkCvEvidence, type CvExtraction, type CvWire } from '../../src/lib/cv/extraction';
import { cvRuleSet } from '../../src/lib/cv/rule-set';
import { extractCv } from '../../src/lib/cv/service';
import { mockExtractor } from '../../src/lib/extraction/mock';
import { scoreStops } from '../../src/lib/score-color';
import { testLists } from '../fixtures/rater';

/** Synthetic CVs only (tests/fixtures/cvs). */
const good = readFileSync('tests/fixtures/cvs/good-cv.txt', 'utf8');
const oversharing = readFileSync('tests/fixtures/cvs/oversharing-cv.txt', 'utf8');

const adult: CvProfile = { ageBand: '18_24', targetJob: 'cafe_restaurant', experience: 'under_1', aimag: null, hasPhoto: false };
const minor: CvProfile = { ...adult, ageBand: '15_17' };

const empty: CvExtraction = {
  language: 'mn-cyrl',
  contact: { phone: null, email: null, other: null },
  home_address: false,
  family_details: false,
  education: [],
  experience: [],
  skills: [],
  languages: [],
  achievements: [],
  references: null,
  spelling_issues: [],
  tone: 'ok',
  suggestions: [],
  evidence: {},
};
const input = (cv: Partial<CvExtraction>, profile: CvProfile = adult, extra: Partial<CvInput> = {}): CvInput => ({
  profile,
  cv: { ...empty, ...cv },
  redactions: {},
  wordCount: 300,
  ...extra,
});
const verdict = (i: CvInput, id: string, contract = undefined as never) =>
  rateCv(i, cvRuleSet, contract).results.find((r) => r.id === id)?.verdict;

describe('cv-rules.yaml', () => {
  it('is what the app imports', () => {
    expect(compiled).toEqual(parse(readFileSync('src/lib/cv/cv-rules.yaml', 'utf8')));
  });

  it('is a draft: no rule is staff-verified yet', () => {
    for (const rule of cvRuleSet.rules) expect(rule.staff_verified, rule.id).toBe(false);
  });
});

describe('CV rules', () => {
  it('C01: a phone or email found in redaction counts as contact; none is a fail, the model\'s silence is unknown', () => {
    expect(verdict(input({}, adult, { redactions: { '[PHONE]': 1 } }), 'C01_CONTACT')).toBe('green');
    expect(verdict(input({}, adult, { redactions: { '[EMAIL]': 1 } }), 'C01_CONTACT')).toBe('green');
    expect(verdict(input({ contact: { phone: false, email: false, other: false } }), 'C01_CONTACT')).toBe('red');
    expect(verdict(input({}), 'C01_CONTACT')).toBe('yellow');
  });

  it('C02: over-sharing is red for a minor, yellow for an adult, and unknown age counts as a minor', () => {
    // A home address rests on the model's reading alone: never more than yellow.
    const shared = input({ home_address: true }, minor);
    expect(verdict(shared, 'C02_OVERSHARING')).toBe('yellow');
    expect(verdict({ ...shared, profile: adult }, 'C02_OVERSHARING')).toBe('yellow');
    expect(verdict(input({ home_address: true }, minor, { redactions: { '[ID]': 1 } }), 'C02_OVERSHARING')).toBe('red');
    expect(verdict(input({}, { ...adult, ageBand: null }, { redactions: { '[ID]': 1 } }), 'C02_OVERSHARING')).toBe('red');
    expect(verdict(input({}, minor, { redactions: { '[ID]': 1 } }), 'C02_OVERSHARING')).toBe('red');
    expect(verdict(input({}, { ...minor, hasPhoto: true }), 'C02_OVERSHARING')).toBe('red');
    expect(verdict(input({}, minor), 'C02_OVERSHARING')).toBe('green');
    expect(verdict(input({}, { ...minor, hasPhoto: null }), 'C02_OVERSHARING')).toBe('yellow');
  });

  it('C03: a prohibited target job is red for a minor, unknown while A/122 is missing, not checked for an adult', () => {
    expect(rateCv(input({}, { ...minor, targetJob: 'mining' }), cvRuleSet, testLists).results.find((r) => r.id === 'C03_TARGET_JOB_ALLOWED')?.verdict).toBe('red');
    expect(verdict(input({}, minor), 'C03_TARGET_JOB_ALLOWED')).toBe('yellow');
    expect(verdict(input({}, adult), 'C03_TARGET_JOB_ALLOWED')).toBeUndefined();
  });

  it('C04: skills are matched in code against the job\'s skill words', () => {
    expect(verdict(input({ skills: ['харилцаа', 'касс'] }), 'C04_SKILLS_MATCH')).toBe('green');
    expect(verdict(input({ skills: ['гитар'] }), 'C04_SKILLS_MATCH')).toBe('yellow');
    expect(verdict(input({ skills: ['гитар'] }, { ...adult, targetJob: 'other' }), 'C04_SKILLS_MATCH')).toBe('yellow');
  });

  it('C05: volunteering, school projects, family business and herding count as experience', () => {
    expect(verdict(input({ experience: [{ kind: 'herding', excerpt: 'мал маллах' }] }), 'C05_EXPERIENCE')).toBe('green');
    expect(verdict(input({}), 'C05_EXPERIENCE')).toBe('yellow');
  });

  it('C08: "quantified" is decided by code — the quote has a digit', () => {
    expect(verdict(input({ achievements: [{ excerpt: 'өдөрт 40 захиалга' }] }), 'C08_QUANTIFIED_ACHIEVEMENTS')).toBe('green');
    expect(verdict(input({ achievements: [{ excerpt: 'сайн ажилласан' }] }), 'C08_QUANTIFIED_ACHIEVEMENTS')).toBe('yellow');
  });

  it('C09: length is counted in code', () => {
    expect(verdict(input({}, adult, { wordCount: 50 }), 'C09_LENGTH')).toBe('yellow');
    expect(verdict(input({}, adult, { wordCount: 300 }), 'C09_LENGTH')).toBe('green');
    expect(verdict(input({}, adult, { wordCount: 2000 }), 'C09_LENGTH')).toBe('yellow');
  });

  it('C11 and C12 rest on the model, so they are labelled and never red', () => {
    const r = rateCv(input({ spelling_issues: ['ажлын туршлгаа'], tone: 'too_informal' }));
    for (const id of ['C11_SPELLING', 'C12_TONE']) {
      const result = r.results.find((x) => x.id === id)!;
      expect(result.verdict).toBe('yellow');
      expect(result.aiJudgment).toBe(true);
    }
  });

  it('uses the shared score: a red CV scores under 40 and never takes a green colour', () => {
    const r = rateCv(input({}, minor, { redactions: { '[ID]': 1 } }));
    expect(r.verdict).toBe('red');
    expect(r.score).toBeLessThan(40);
    expect(scoreStops(r.score).slice(0, 2)).toEqual(['red', 'amber']);
  });
});

describe('the CV evidence check', () => {
  const text = 'Боловсрол\nЖишээ сургууль\nУр чадвар\nхарилцаа';
  const wire = (patch: Partial<CvWire>): CvWire => ({ ...(empty as unknown as CvWire), evidence: [], ...patch });

  it('drops quotes the CV does not contain', () => {
    const { cv, dropped } = checkCvEvidence(wire({ education: ['Жишээ сургууль', 'Харвардын их сургууль'], skills: ['харилцаа', 'Python'] }), text);
    expect(cv.education).toEqual(['Жишээ сургууль']);
    expect(cv.skills).toEqual(['харилцаа']);
    expect(dropped).toEqual(expect.arrayContaining(['education', 'skills']));
  });

  it('drops a suggestion that quotes something the CV does not say', () => {
    const { cv } = checkCvEvidence(wire({ suggestions: [{ excerpt: '5 жил менежер', suggestion: 'x' }, { excerpt: 'Жишээ сургууль', suggestion: 'y' }] }), text);
    expect(cv.suggestions).toEqual([{ excerpt: 'Жишээ сургууль', suggestion: 'y' }]);
  });

  it('a yes without its excerpt becomes unknown', () => {
    const { cv } = checkCvEvidence(wire({ home_address: true }), text);
    expect(cv.home_address).toBeNull();
  });
});

describe('the CV pipeline end to end (mock reader)', () => {
  afterEach(() => vi.unstubAllEnvs());

  it('rates a good CV for a café job', async () => {
    const { cv, redactions, wordCount, text } = await extractCv(good, mockExtractor);
    expect(text).not.toContain('9900 0011');
    expect(text).not.toContain('jishee.cv@example.org');
    const r = rateCv({ profile: adult, cv, redactions, wordCount });
    expect(r.results.find((x) => x.id === 'C01_CONTACT')?.verdict).toBe('green');
    expect(r.results.find((x) => x.id === 'C04_SKILLS_MATCH')?.verdict).toBe('green');
    expect(r.results.find((x) => x.id === 'C08_QUANTIFIED_ACHIEVEMENTS')?.verdict).toBe('green');
  });

  it('flags a minor\'s CV that shares a register number, a home address and family details', async () => {
    const { cv, redactions, wordCount } = await extractCv(oversharing, mockExtractor);
    const r = rateCv({ profile: minor, cv, redactions, wordCount });
    const c02 = r.results.find((x) => x.id === 'C02_OVERSHARING')!;
    expect(c02.verdict).toBe('red');
    expect(c02.details.map((d) => d.key)).toEqual(expect.arrayContaining(['registerNumber', 'homeAddress', 'familyDetails']));
    expect(r.verdict).toBe('red');
  });

  it('POST /api/cv/check returns the rating, never the raw text', async () => {
    vi.stubEnv('RATER_EXTRACTOR', 'mock');
    const response = await cvPOST(
      new Request('http://x/api/cv/check', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ text: oversharing, profile: minor }) }),
    );
    expect(response.status).toBe(200);
    const body = await response.text();
    expect(body).not.toContain('11111111');
    expect(JSON.parse(body).rating.verdict).toBe('red');
  });
});

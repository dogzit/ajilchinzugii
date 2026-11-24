import { z } from 'zod';
import { normalize } from '../extraction/evidence';
import { ruleSet as contractRuleSet, type RuleSet } from '../rater/rule-set';
import { computeScore } from '../rater/score';
import { worstVerdict, type Verdict, verdictRank } from '../rater/verdict';
import type { Detail, Status } from '../rater/engine';
import type { CvExtraction } from './extraction';
import { cvRuleSet as currentCvRuleSet, type CvRuleSet } from './rule-set';

/**
 * The CV rater's engine: pure, like the contract engine, and scored with the
 * same score function. The model's part ended at the extraction; everything
 * here — counts, matches, the verdicts — is code reading cv-rules.yaml.
 */

export const cvProfileSchema = z.object({
  ageBand: z.enum(['13_14', '15_17', '18_24']).nullable(),
  targetJob: z.string().max(40).nullable(),
  experience: z.enum(['none', 'under_1', 'from_1_to_3', 'over_3']).nullable(),
  aimag: z.string().max(40).nullable(),
  /** "Does your CV have a photo of you?" — a photo cannot be seen in text. */
  hasPhoto: z.boolean().nullable(),
});
export type CvProfile = z.infer<typeof cvProfileSchema>;

export type CvInput = {
  profile: CvProfile;
  cv: CvExtraction;
  /** From the server's redaction: what the CV contained before it was masked. */
  redactions: Record<string, number>;
  wordCount: number;
};

export type CvResult = {
  id: string;
  verdict: Verdict;
  status: Status;
  details: Detail[];
  quotes: string[];
  aiJudgment: boolean;
};

export type CvRating = {
  ruleSetVersion: string;
  results: CvResult[];
  verdict: Verdict;
  score: number;
  unverified: boolean;
  suggestions: { excerpt: string; suggestion: string }[];
};

type Outcome = { status: Status | 'na'; severity?: 'red' | 'yellow'; details?: Detail[]; quotes?: string[] };

const minor = (p: CvProfile) => (p.ageBand === null ? null : p.ageBand !== '18_24');

const evaluators: Record<string, (input: CvInput, set: CvRuleSet, contract: RuleSet) => Outcome> = {
  C01_CONTACT({ cv, redactions }) {
    const phone = (redactions['[PHONE]'] ?? 0) > 0 || cv.contact.phone === true;
    const email = (redactions['[EMAIL]'] ?? 0) > 0 || cv.contact.email === true;
    if (phone || email || cv.contact.other === true) return { status: 'pass' };
    return { status: 'fail', details: [{ key: 'noContact' }] };
  },

  C02_OVERSHARING({ cv, redactions, profile }, set) {
    const params = set.rules.find((r) => r.id === 'C02_OVERSHARING')!.params as { severity_minor: 'red' | 'yellow'; severity_adult: 'red' | 'yellow' };
    const found: Detail[] = [];
    if ((redactions['[ID]'] ?? 0) > 0) found.push({ key: 'registerNumber' });
    if (cv.home_address === true) found.push({ key: 'homeAddress' });
    if (cv.family_details === true) found.push({ key: 'familyDetails' });
    if (profile.hasPhoto === true) found.push({ key: 'photo' });
    const quotes = [cv.evidence.home_address?.excerpt, cv.evidence.family_details?.excerpt].filter((q): q is string => Boolean(q));
    if (found.length) {
      // Unknown age gets the minor's severity: doubt protects the young person.
      const severity = minor(profile) === false ? params.severity_adult : params.severity_minor;
      return { status: 'fail', severity, details: found, quotes };
    }
    if (cv.home_address === null || cv.family_details === null || profile.hasPhoto === null) return { status: 'unknown', details: [{ key: 'oversharingUnknown' }] };
    return { status: 'pass' };
  },

  C03_TARGET_JOB_ALLOWED({ profile }, _set, contract) {
    const isMinor = minor(profile);
    if (isMinor === false) return { status: 'na' };
    const id = profile.targetJob;
    let outcome: Outcome;
    if (!id || id === 'other') outcome = { status: 'unknown', details: [{ key: 'jobUnknown' }] };
    else if (contract.a122_prohibited.includes(id)) outcome = { status: 'fail', details: [{ key: 'jobProhibited' }] };
    else if (contract.a122_cleared.includes(id)) outcome = { status: 'pass' };
    else outcome = { status: 'unknown', details: [{ key: 'listsPending' }] };
    // Age not given: a prohibited job is a warning, not a finding.
    return isMinor === null && outcome.status === 'fail' ? { ...outcome, status: 'unknown' } : outcome;
  },

  C04_SKILLS_MATCH({ cv, profile }, set) {
    const { min_matches } = set.rules.find((r) => r.id === 'C04_SKILLS_MATCH')!.params as { min_matches: number };
    const words = (profile.targetJob && set.skills[profile.targetJob]) || [];
    if (!words.length) return { status: 'unknown', details: [{ key: 'skillsUnknownJob' }] };
    const listed = normalize(cv.skills.join(' | '));
    const matched = words.filter((word) => listed.includes(normalize(word)));
    const details = [{ key: 'skillsMatched', values: { count: matched.length, min: min_matches } }];
    return matched.length >= min_matches ? { status: 'pass', details } : { status: 'fail', details };
  },

  C05_EXPERIENCE: ({ cv }) => (cv.experience.length ? { status: 'pass', details: [{ key: 'experienceCount', values: { count: cv.experience.length } }] } : { status: 'fail', details: [{ key: 'noExperience' }] }),
  C06_EDUCATION: ({ cv }) => (cv.education.length ? { status: 'pass' } : { status: 'fail' }),
  C07_LANGUAGES: ({ cv }) => (cv.languages.length ? { status: 'pass' } : { status: 'fail' }),

  C08_QUANTIFIED_ACHIEVEMENTS({ cv }) {
    // "Quantified" is decided here, not by the model: the quote has a number in it.
    const quantified = cv.achievements.filter((a) => /\d/.test(a.excerpt));
    if (quantified.length) return { status: 'pass', quotes: quantified.map((a) => a.excerpt).slice(0, 2) };
    return { status: 'fail', details: [{ key: cv.achievements.length ? 'achievementsNoNumbers' : 'noAchievements' }] };
  },

  C09_LENGTH({ wordCount }, set) {
    const { min_words, max_words } = set.rules.find((r) => r.id === 'C09_LENGTH')!.params as { min_words: number; max_words: number };
    const details = [{ key: 'wordCount', values: { count: wordCount, min: min_words, max: max_words } }];
    return wordCount >= min_words && wordCount <= max_words ? { status: 'pass', details } : { status: 'fail', details };
  },

  C10_REFERENCES: ({ cv }) => (cv.references === true ? { status: 'pass' } : { status: 'fail' }),

  C11_SPELLING: ({ cv }) => (cv.spelling_issues.length ? { status: 'fail', quotes: cv.spelling_issues.slice(0, 5) } : { status: 'pass' }),

  C12_TONE({ cv }) {
    if (cv.tone === 'ok') return { status: 'pass' };
    if (cv.tone === null) return { status: 'unknown' };
    return { status: 'fail', details: [{ key: cv.tone === 'too_informal' ? 'toneInformal' : 'toneUnclear' }], quotes: cv.evidence.tone ? [cv.evidence.tone.excerpt] : [] };
  },
};

export function rateCv(input: CvInput, set: CvRuleSet = currentCvRuleSet, contract: RuleSet = contractRuleSet): CvRating {
  const results: CvResult[] = [];
  for (const rule of set.rules) {
    const evaluate = evaluators[rule.id];
    if (!evaluate) throw new Error(`No evaluator for CV rule ${rule.id}`);
    if (rule.applies_to === 'minor' && minor(input.profile) === false) continue;
    const outcome = evaluate(input, set, contract);
    if (outcome.status === 'na') continue;
    const status = outcome.status as Status;
    let verdict: Verdict = status === 'pass' ? 'green' : status === 'unknown' ? rule.if_unknown : (outcome.severity ?? rule.severity_if_fail);
    // A judgment the model made is never more than yellow.
    if (rule.ai_judgment && verdict === 'red') verdict = 'yellow';
    results.push({ id: rule.id, verdict, status, details: outcome.details ?? [], quotes: outcome.quotes ?? [], aiJudgment: Boolean(rule.ai_judgment) });
  }
  const order = new Map(set.rules.map((r, i) => [r.id, i]));
  results.sort((a, b) => verdictRank[b.verdict] - verdictRank[a.verdict] || (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
  const verdict = worstVerdict(results.map((r) => r.verdict));
  const weights = new Map(set.rules.map((r) => [r.id, r.score_weight]));
  return {
    ruleSetVersion: set.version,
    results,
    verdict,
    score: computeScore(results.map((r) => ({ status: r.status, weight: weights.get(r.id)! })), verdict, false, set.score),
    unverified: set.rules.some((r) => !r.staff_verified),
    suggestions: input.cv.suggestions,
  };
}

export const wordCount = (text: string) => (text.match(/[\p{L}\p{N}]+/gu) ?? []).length;

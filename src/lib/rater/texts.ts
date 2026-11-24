import type { CategoryOption, RuleText } from '@/components/rater/types';
import { cvRuleSet } from '../cv/rule-set';
import { ruleSet } from './rule-set';

/**
 * rules.yaml's reader-facing text in one language. Mongolian is the
 * authoritative wording; English is marked as an unofficial translation.
 */
export function raterRuleTexts(locale: string): Record<string, RuleText> {
  const mn = locale === 'mn';
  return Object.fromEntries(
    ruleSet.rules.map((rule) => [
      rule.id,
      {
        id: rule.id,
        title: mn ? rule.title_mn : rule.title_en,
        explain: mn ? rule.explain_mn : rule.explain_en,
        article: rule.article,
        unofficial: !mn,
      },
    ]),
  );
}

export function raterCategories(locale: string): CategoryOption[] {
  return ruleSet.job_categories.map((c) => ({ id: c.id, name: locale === 'mn' ? c.name_mn : c.name_en }));
}

/** cv-rules.yaml's reader-facing text in one language. */
export function cvRuleTexts(locale: string): Record<string, RuleText> {
  const mn = locale === 'mn';
  return Object.fromEntries(
    cvRuleSet.rules.map((rule) => [
      rule.id,
      { id: rule.id, title: mn ? rule.title_mn : rule.title_en, explain: mn ? rule.explain_mn : rule.explain_en, article: null, unofficial: !mn },
    ]),
  );
}

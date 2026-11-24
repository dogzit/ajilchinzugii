import type { Detail } from './engine';

/**
 * Turning the engine's details into sentences, in either language.
 *
 * Shared by the browser (results page) and the server (employer message), so
 * it imports nothing at runtime: no translation library reaches the browser,
 * only the strings the page hands it.
 */

export type RaterDict = {
  details: Record<string, string>;
  terms: Record<string, string>;
  clauses: Record<string, string>;
};

export const fill = (template: string, values: Record<string, string | number> = {}): string =>
  template.replace(/\{(\w+)\}/g, (match, key: string) => (key in values ? String(values[key]) : match));

export function renderDetail(detail: Detail, dict: RaterDict, locale: string): string {
  const number = new Intl.NumberFormat(locale, { maximumFractionDigits: 1 });
  const values: Record<string, string | number> = {};
  for (const [key, value] of Object.entries(detail.values ?? {})) {
    values[key] = typeof value === 'number' ? number.format(value) : value;
  }
  if (detail.key === 'missingTerm') values.term = dict.terms[String(detail.values?.term)] ?? values.term ?? '';
  if (detail.key === 'clause') values.category = dict.clauses[String(detail.values?.category)] ?? values.category ?? '';
  return fill(dict.details[detail.key] ?? detail.key, values);
}

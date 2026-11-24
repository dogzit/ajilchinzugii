import { getTranslations } from 'next-intl/server';
import { hasLocale } from 'next-intl';
import { routing } from '@/i18n/routing';
import { json, problem, readJson, todayInUlaanbaatar } from '@/lib/rater/http';
import { ratingRequestSchema } from '@/lib/rater/request';
import { ruleSet } from '@/lib/rater/rule-set';
import { buildTemplate } from '@/lib/rater/template';
import { renderTemplatePdf } from '@/lib/rater/template-pdf';

/**
 * The corrected contract template, as JSON (for the print view) or as a PDF.
 * Built in memory from the posted fields and returned; nothing is kept.
 * `?format=pdf&locale=mn` — neither carries anything about the reader.
 */
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const url = new URL(request.url);
  const locale = url.searchParams.get('locale') ?? routing.defaultLocale;
  if (!hasLocale(routing.locales, locale)) return problem('bad_locale', 400);

  const body = await readJson(request, ratingRequestSchema);
  if (!body.ok) return body.response;

  const t = await getTranslations({ locale, namespace: 'rater.template' });
  const fields = body.data.actual ?? body.data.fields;
  const doc = buildTemplate(fields, todayInUlaanbaatar(), ruleSet, (key, values) => t(key, values), locale);

  if (url.searchParams.get('format') !== 'pdf') return json(doc);

  const pdf = await renderTemplatePdf(doc);
  return new Response(pdf as BodyInit, {
    headers: {
      'content-type': 'application/pdf',
      // A fixed name: nothing about the reader goes into a file name (rule 4).
      'content-disposition': 'attachment; filename="contract-template.pdf"',
      'cache-control': 'no-store',
    },
  });
}

import { limit } from '@/lib/rate-limit';
import mn from '@messages/tools/mn.json';
import { writeEmployerMessage } from '@/lib/rater/employer-message';
import { json, problem, readJson } from '@/lib/rater/http';
import { renderDetail } from '@/lib/rater/present';
import { rateRequest, ratingRequestSchema } from '@/lib/rater/request';
import { ruleSet } from '@/lib/rater/rule-set';

/**
 * The message to the employer, drafted from the failed rules only. The
 * fields are rated again here; the model sees rule titles, articles, the
 * Mongolian explanations and the facts the engine found — never the contract
 * text, and nothing that names the worker. The message is always Mongolian:
 * it is written to a Mongolian employer.
 */
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const limited = await limit(request, 'message');
  if (limited) return limited;
  const body = await readJson(request, ratingRequestSchema);
  if (!body.ok) return body.response;

  const rating = rateRequest(body.data);
  const failed = rating.results.filter((r) => r.status === 'fail');
  if (!failed.length) return problem('nothing_failed', 422);

  const rules = new Map(ruleSet.rules.map((rule) => [rule.id, rule]));
  const dict = mn.rater;
  const result = await writeEmployerMessage({
    minor: ['under_13', '13_14', '15_17'].includes(rating.ageBand),
    failed: failed.map((r) => {
      const rule = rules.get(r.id)!;
      return {
        title: rule.title_mn,
        article: rule.article,
        explanation: rule.explain_mn,
        facts: r.details.map((d) => renderDetail(d, dict, 'mn')),
      };
    }),
    template: dict.employerMessage,
  });
  return json(result);
}

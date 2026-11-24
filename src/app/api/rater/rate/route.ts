import { logEvent } from '@/lib/log';
import { limit } from '@/lib/rate-limit';
import { json, readJson } from '@/lib/rater/http';
import { rateRequest, ratingRequestSchema } from '@/lib/rater/request';

/**
 * POST the confirmed fields, get the rating. Pure computation: nothing about
 * the request is stored or logged.
 */
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const limited = await limit(request, 'rate');
  if (limited) return limited;
  const body = await readJson(request, ratingRequestSchema);
  if (!body.ok) return body.response;
  // Production feedback (spec, data item 10): which fields people correct,
  // never what they corrected them to. The logger drops anything that is
  // not a known field path.
  if (body.data.corrected?.length) logEvent('corrected_fields', { fields: body.data.corrected });
  return json(rateRequest(body.data));
}

import { json, readJson } from '@/lib/rater/http';
import { rateRequest, ratingRequestSchema } from '@/lib/rater/request';

/**
 * POST the confirmed fields, get the rating. Pure computation: nothing about
 * the request is stored or logged.
 */
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const body = await readJson(request, ratingRequestSchema);
  if (!body.ok) return body.response;
  return json(rateRequest(body.data));
}

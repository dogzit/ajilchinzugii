import { after } from 'next/server';
import { getPayload } from 'payload';
import config from '@/payload.config';
import { logEvent } from '@/lib/log';
import { recordStats } from '@/lib/rater/stats';
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
  const rating = rateRequest(body.data);
  // The anonymous counts are written after the response: the reader never
  // waits on them, and a failure there never costs them their result.
  // Off in end-to-end runs: CI's browser job reads a real database.
  if (process.env.RATER_STATS_DISABLED !== 'true') {
    try {
      after(async () => {
        try {
          await recordStats(await getPayload({ config }), rating, body.data.actual ?? body.data.fields);
        } catch {
          logEvent('extraction_failed', { kind: 'contract', code: 'unreadable' });
        }
      });
    } catch {
      // Called outside a Next request (unit tests): no counts to keep.
    }
  }
  return json(rating);
}

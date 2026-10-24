import { timingSafeEqual } from 'node:crypto';
import { revalidateTag } from 'next/cache';
import { NextResponse } from 'next/server';
import { IMPACT_CACHE_TAG } from '@/lib/impact/client';

/**
 * On-demand revalidation of the impact figures.
 *
 * Two callers, two secrets:
 *  - POST with `x-revalidate-secret: $REVALIDATE_SECRET` — a person or a
 *    script, for when the sheet changed and the daily window is too slow;
 *  - GET with `authorization: Bearer $CRON_SECRET` — the Vercel cron in
 *    vercel.json, which can only issue GET requests.
 *
 * Anything else is 401. The route never reads the sheet itself; it only drops
 * the cache entry so the next render fetches afresh.
 */

export const dynamic = 'force-dynamic';

function secretsMatch(provided: string | null, expected: string | undefined): boolean {
  if (!provided || !expected) return false;

  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  // timingSafeEqual throws on a length mismatch, which would itself leak length.
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

function revalidated() {
  // Next 16 wants a cacheLife profile; 'max' is the documented equivalent of
  // the old single-argument purge, and `updateTag` is Server-Actions-only.
  revalidateTag(IMPACT_CACHE_TAG, 'max');
  return NextResponse.json(
    { revalidated: true, tag: IMPACT_CACHE_TAG, at: new Date().toISOString() },
    { headers: { 'cache-control': 'no-store' } },
  );
}

const unauthorized = () =>
  NextResponse.json({ revalidated: false, error: 'unauthorized' }, { status: 401 });

const notConfigured = (which: string) => {
  console.error(`[revalidate] ${which} is not configured at ${new Date().toISOString()}`);
  return NextResponse.json(
    { revalidated: false, error: 'not configured' },
    { status: 503 },
  );
};

export async function POST(request: Request): Promise<Response> {
  const expected = process.env.REVALIDATE_SECRET;
  if (!expected) return notConfigured('REVALIDATE_SECRET');

  if (!secretsMatch(request.headers.get('x-revalidate-secret'), expected)) {
    return unauthorized();
  }
  return revalidated();
}

/** Vercel cron. */
export async function GET(request: Request): Promise<Response> {
  const expected = process.env.CRON_SECRET;
  if (!expected) return notConfigured('CRON_SECRET');

  const header = request.headers.get('authorization');
  const token = header?.startsWith('Bearer ') ? header.slice('Bearer '.length) : null;

  if (!secretsMatch(token, expected)) {
    return unauthorized();
  }
  return revalidated();
}

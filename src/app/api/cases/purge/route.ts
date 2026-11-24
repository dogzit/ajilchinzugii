import { timingSafeEqual } from 'node:crypto';
import { getPayload } from 'payload';
import config from '@/payload.config';
import { caseFileStore } from '@/lib/cases/files';
import { purgeCaseFiles } from '@/lib/cases/intake';
import { logEvent } from '@/lib/log';
import { json, problem } from '@/lib/rater/http';

/**
 * The daily purge of opted-in case files (90 days, or the case closed),
 * called by the same cron as the impact revalidation, with the same secret.
 */
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const expected = process.env.CRON_SECRET;
  const given = request.headers.get('authorization')?.replace(/^Bearer /, '') ?? '';
  if (!expected || given.length !== expected.length || !timingSafeEqual(Buffer.from(given), Buffer.from(expected))) {
    return problem('unauthorized', 401);
  }
  const purged = await purgeCaseFiles(await getPayload({ config }), caseFileStore());
  logEvent('case_purge', { purged });
  return json({ purged });
}

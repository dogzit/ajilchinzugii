import { getPayload } from 'payload';
import config from '@/payload.config';
import { z } from 'zod';
import { verifyDeleteToken } from '@/lib/cases/crypto';
import { caseFileStore } from '@/lib/cases/files';
import { deleteCase } from '@/lib/cases/intake';
import { limit } from '@/lib/rate-limit';
import { json, problem, readJson } from '@/lib/rater/http';

/** The emailed delete link: a valid signed token deletes the case and its file. */
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const limited = await limit(request, 'cases');
  if (limited) return limited;
  const body = await readJson(request, z.object({ token: z.string().max(200) }));
  if (!body.ok) return body.response;
  const caseId = await verifyDeleteToken(body.data.token).catch(() => null);
  if (!caseId) return problem('invalid_token', 400);
  const deleted = await deleteCase(await getPayload({ config }), caseId, caseFileStore());
  return json({ deleted });
}

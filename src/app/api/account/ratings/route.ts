import { z } from 'zod';
import { currentUserId } from '@/lib/accounts/clerk';
import { sameOrigin } from '@/lib/accounts/http';
import { canStore, findMember, payload } from '@/lib/accounts/members';
import { json, problem, readJson, todayInUlaanbaatar } from '@/lib/rater/http';

/**
 * Saves a rating the member chose to keep: rule ids and colours, the score,
 * the rule set version and the date. Nothing else is accepted, so no answer,
 * value or text can end up stored this way.
 */
export const dynamic = 'force-dynamic';

const verdict = z.enum(['red', 'yellow', 'green']);
const bodySchema = z.object({
  kind: z.enum(['contract', 'cv']),
  ruleSetVersion: z.string().max(40),
  verdict,
  score: z.number().int().min(1).max(100),
  results: z.array(z.object({ id: z.string().regex(/^[A-Z]\d{2}_[A-Z0-9_]+$/), verdict })).max(40),
});

export async function POST(request: Request) {
  if (!sameOrigin(request)) return problem('forbidden', 403);
  const userId = await currentUserId();
  if (!userId) return problem('unauthorized', 401);
  const member = await findMember(userId);
  if (!member || !canStore(member)) return problem('no_consent', 403);
  const body = await readJson(request, bodySchema);
  if (!body.ok) return body.response;
  const p = await payload();
  await p.create({
    collection: 'saved-ratings',
    overrideAccess: true,
    data: { member: member.id, ...body.data, ratedOn: todayInUlaanbaatar() },
  });
  return json({ ok: true });
}

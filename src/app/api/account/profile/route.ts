import { currentUserId } from '@/lib/accounts/clerk';
import { sameOrigin } from '@/lib/accounts/http';
import { findMember, isMinorBand, memberProfileSchema, payload } from '@/lib/accounts/members';
import { json, problem, readJson } from '@/lib/rater/http';

/**
 * Creates or updates the signed-in member's profile. A member under 18 can
 * keep data only once a guardian has ticked the consent box; the moment of
 * that consent is recorded. Under 13 is not an option: no account.
 */
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  if (!sameOrigin(request)) return problem('forbidden', 403);
  const userId = await currentUserId();
  if (!userId) return problem('unauthorized', 401);
  const body = await readJson(request, memberProfileSchema);
  if (!body.ok) return body.response;
  const data = body.data;
  const p = await payload();
  const existing = await findMember(userId);

  const ageBand = data.ageBand ?? existing?.ageBand;
  if (!ageBand) return problem('age_band_required', 422);
  const consent = data.guardianConsent ?? existing?.guardianConsent ?? false;
  if (isMinorBand(ageBand) && !consent) return problem('guardian_consent_required', 422);

  const fields = {
    ageBand,
    guardianConsent: consent,
    guardianConsentAt: consent ? (existing?.guardianConsent ? existing.guardianConsentAt : new Date().toISOString()) : null,
    ...(data.targetJob !== undefined ? { targetJob: data.targetJob } : {}),
    ...(data.aimag !== undefined ? { aimag: data.aimag } : {}),
    ...(data.cvProfile !== undefined ? { cvProfile: data.cvProfile } : {}),
  };
  const member = existing
    ? await p.update({ collection: 'members', id: existing.id, data: fields, overrideAccess: true })
    : await p.create({ collection: 'members', data: { clerkUserId: userId, ...fields }, overrideAccess: true });
  return json({ ok: true, ageBand: member.ageBand });
}

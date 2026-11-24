import { getPayload } from 'payload';
import { z } from 'zod';
import config from '../../payload.config';
import { AIMAGS } from '../aimags';
import { cvProfileSchema } from '../cv/engine';
import type { Member } from '../../payload-types';

/**
 * Members and their saved ratings, through the Local API (access control is
 * the server's job here: every caller has already checked `auth()`).
 */

export const payload = () => getPayload({ config });

export const ageBands = ['13_14', '15_17', '18_24'] as const;

/** What the sign-up gate stores in Clerk's unsafeMetadata, and the profile form posts. */
export const memberProfileSchema = z.object({
  ageBand: z.enum(ageBands).optional(),
  guardianConsent: z.boolean().optional(),
  targetJob: z.string().max(40).nullable().optional(),
  aimag: z.enum(AIMAGS).nullable().optional(),
  cvProfile: cvProfileSchema.nullable().optional(),
});

export const isMinorBand = (band: string | null | undefined) => band === '13_14' || band === '15_17';

/** A member may keep data only with an age band, and — under 18 — a guardian's consent. */
export const canStore = (member: Pick<Member, 'ageBand' | 'guardianConsent'>) =>
  Boolean(member.ageBand) && (!isMinorBand(member.ageBand) || member.guardianConsent === true);

export async function findMember(clerkUserId: string): Promise<Member | null> {
  const p = await payload();
  const { docs } = await p.find({ collection: 'members', where: { clerkUserId: { equals: clerkUserId } }, limit: 1, depth: 0 });
  return docs[0] ?? null;
}

/**
 * Creates the member row from what the sign-up gate recorded, the first time
 * the account page is opened. Under 13 there is no account; 13–17 needs the
 * guardian's consent; anything missing means the profile form is shown first.
 */
export async function ensureMember(clerkUserId: string, metadata: unknown): Promise<Member | null> {
  const existing = await findMember(clerkUserId);
  if (existing) return existing;
  const parsed = memberProfileSchema.safeParse(metadata);
  const data = parsed.success ? parsed.data : {};
  if (!data.ageBand) return null;
  if (isMinorBand(data.ageBand) && data.guardianConsent !== true) return null;
  const p = await payload();
  return p.create({
    collection: 'members',
    overrideAccess: true,
    data: {
      clerkUserId,
      ageBand: data.ageBand,
      guardianConsent: data.guardianConsent === true,
      guardianConsentAt: data.guardianConsent ? new Date().toISOString() : null,
    },
  });
}

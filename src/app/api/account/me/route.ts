import { clerkConfigured, currentUserId } from '@/lib/accounts/clerk';
import { canStore, findMember } from '@/lib/accounts/members';
import { json } from '@/lib/rater/http';

/** Who is signed in, for the raters' "save" offers — read on the server, no Clerk JS on the page. */
export const dynamic = 'force-dynamic';

export async function GET() {
  if (!clerkConfigured()) return json({ configured: false, signedIn: false });
  const userId = await currentUserId();
  if (!userId) return json({ configured: true, signedIn: false });
  const member = await findMember(userId);
  return json({
    configured: true,
    signedIn: true,
    member: member
      ? {
          ageBand: member.ageBand,
          targetJob: member.targetJob ?? null,
          aimag: member.aimag ?? null,
          cvProfile: member.cvProfile ?? null,
          canStore: canStore(member),
        }
      : null,
  });
}

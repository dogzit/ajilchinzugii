import { currentUserId } from '@/lib/accounts/clerk';
import { deleteMemberData } from '@/lib/accounts/delete';
import { sameOrigin } from '@/lib/accounts/http';
import { json, problem } from '@/lib/rater/http';

/**
 * "Delete my account and data": every row of ours first, then the Clerk user.
 * If Clerk's deletion fails, our data is already gone, and Clerk's own
 * user.deleted webhook will not find anything left to remove.
 */
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  if (!sameOrigin(request)) return problem('forbidden', 403);
  const userId = await currentUserId();
  if (!userId) return problem('unauthorized', 401);
  await deleteMemberData(userId);
  const { clerkClient } = await import('@clerk/nextjs/server');
  try {
    await (await clerkClient()).users.deleteUser(userId);
  } catch {
    return problem('clerk_delete_failed', 502);
  }
  return json({ ok: true });
}

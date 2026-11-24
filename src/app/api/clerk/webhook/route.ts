import { deleteMemberData } from '@/lib/accounts/delete';
import { problem, json } from '@/lib/rater/http';

/**
 * Clerk's webhooks, verified with the Svix signing secret
 * (CLERK_WEBHOOK_SIGNING_SECRET). Only user.deleted is acted on: an account
 * deleted from Clerk's side takes every row of ours with it.
 */
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  if (!process.env.CLERK_WEBHOOK_SIGNING_SECRET?.trim()) return problem('not_configured', 503);
  const { verifyWebhook } = await import('@clerk/nextjs/webhooks');
  let event;
  try {
    event = await verifyWebhook(request as never);
  } catch {
    return problem('invalid_signature', 400);
  }
  if (event.type === 'user.deleted' && event.data.id) await deleteMemberData(event.data.id);
  return json({ ok: true });
}

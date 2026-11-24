/**
 * Accounts are optional, and so is Clerk itself: with no keys the site runs
 * without accounts (every tool still works), the account pages say accounts
 * are not set up yet, and nothing tries to reach Clerk. Keys come from env
 * only (CLAUDE.md rule 10).
 */
export const clerkConfigured = (env: Record<string, string | undefined> = process.env): boolean =>
  Boolean(env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.trim() && env.CLERK_SECRET_KEY?.trim());

/** Clerk's Frontend API, proxied through this site's own origin (ADR §4). */
export const CLERK_PROXY_PATH = '/__clerk';

/** The signed-in Clerk user id, read on the server — or null with no session or no Clerk. */
export async function currentUserId(): Promise<string | null> {
  if (!clerkConfigured()) return null;
  const { auth } = await import('@clerk/nextjs/server');
  const { userId } = await auth();
  return userId ?? null;
}

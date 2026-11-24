// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * The account API, with Clerk and the database replaced by in-memory
 * stand-ins (unit tests never reach a real database). What is checked is the
 * policy: who may store what, under-18 consent, and that deletion takes
 * every row.
 */

const state = vi.hoisted(() => ({
  userId: null as string | null,
  members: [] as Record<string, unknown>[],
  ratings: [] as Record<string, unknown>[],
  deletedClerk: [] as string[],
}));

vi.mock('@/lib/accounts/clerk', () => ({
  clerkConfigured: () => true,
  currentUserId: async () => state.userId,
  CLERK_PROXY_PATH: '/__clerk',
}));

vi.mock('@clerk/nextjs/server', () => ({
  clerkClient: async () => ({ users: { deleteUser: async (id: string) => void state.deletedClerk.push(id) } }),
}));

vi.mock('@/lib/accounts/members', async (importOriginal) => {
  const real = await importOriginal<typeof import('../../src/lib/accounts/members')>();
  const fake = {
    find: async ({ collection, where }: { collection: string; where: Record<string, { equals: unknown }> }) => {
      const rows = collection === 'members' ? state.members : state.ratings;
      const [key, cond] = Object.entries(where)[0]!;
      return { docs: rows.filter((r) => r[key] === cond.equals) };
    },
    create: async ({ collection, data }: { collection: string; data: Record<string, unknown> }) => {
      const rows = collection === 'members' ? state.members : state.ratings;
      const row = { id: rows.length + 1, ...data };
      rows.push(row);
      return row;
    },
    update: async ({ id, data }: { id: number; data: Record<string, unknown> }) => Object.assign(state.members.find((m) => m.id === id)!, data),
    delete: async ({ collection, id, where }: { collection: string; id?: number; where?: Record<string, { equals: unknown }> }) => {
      if (collection === 'members') state.members = state.members.filter((m) => m.id !== id);
      else state.ratings = state.ratings.filter((r) => r.member !== where?.member?.equals);
    },
  };
  return {
    ...real,
    payload: async () => fake,
    findMember: async (clerkUserId: string) => state.members.find((m) => m.clerkUserId === clerkUserId) ?? null,
  };
});

const { POST: profilePOST } = await import('../../src/app/api/account/profile/route');
const { POST: ratingsPOST } = await import('../../src/app/api/account/ratings/route');
const { POST: deletePOST } = await import('../../src/app/api/account/delete/route');
const { GET: meGET } = await import('../../src/app/api/account/me/route');

const post = (handler: (r: Request) => Promise<Response>, body: unknown, origin = 'http://site.test') =>
  handler(new Request('http://site.test/api/account/x', { method: 'POST', headers: { origin, 'content-type': 'application/json' }, body: JSON.stringify(body) }));

const summary = { kind: 'contract', ruleSetVersion: 'v1', verdict: 'red', score: 9, results: [{ id: 'Q01_UNPAID', verdict: 'red' }] };

beforeEach(() => {
  state.userId = 'user_1';
  state.members = [];
  state.ratings = [];
  state.deletedClerk = [];
});

describe('the account API', () => {
  it('refuses anyone not signed in, and any other origin', async () => {
    state.userId = null;
    expect((await post(profilePOST, { ageBand: '18_24' })).status).toBe(401);
    state.userId = 'user_1';
    expect((await post(profilePOST, { ageBand: '18_24' }, 'https://evil.test')).status).toBe(403);
  });

  it('under 18 needs a guardian\'s consent, recorded with its time', async () => {
    expect((await post(profilePOST, { ageBand: '15_17' })).status).toBe(422);
    expect((await post(profilePOST, { ageBand: '15_17', guardianConsent: true })).status).toBe(200);
    expect(state.members[0]).toMatchObject({ ageBand: '15_17', guardianConsent: true });
    expect(typeof state.members[0]!.guardianConsentAt).toBe('string');
  });

  it('has no under-13 option at all', async () => {
    expect((await post(profilePOST, { ageBand: 'under_13' })).status).toBe(422);
    expect(state.members).toEqual([]);
  });

  it('saves a rating only for a member who may store data, and only rule ids and colours', async () => {
    expect((await post(ratingsPOST, summary)).status).toBe(403);
    await post(profilePOST, { ageBand: '18_24' });
    expect((await post(ratingsPOST, summary)).status).toBe(200);
    expect((await post(ratingsPOST, { ...summary, fields: { worker: { date_of_birth: '2010-01-01' } } })).status).toBe(200);
    expect(JSON.stringify(state.ratings)).not.toContain('2010-01-01');
    expect((await post(ratingsPOST, { ...summary, results: [{ id: 'not a rule', verdict: 'red' }] })).status).toBe(422);
  });

  it('"delete my account and data" removes every row and the Clerk user', async () => {
    await post(profilePOST, { ageBand: '18_24' });
    await post(ratingsPOST, summary);
    expect((await post(deletePOST, {})).status).toBe(200);
    expect(state.members).toEqual([]);
    expect(state.ratings).toEqual([]);
    expect(state.deletedClerk).toEqual(['user_1']);
  });

  it('/me tells the page who is signed in, from the server', async () => {
    await post(profilePOST, { ageBand: '13_14', guardianConsent: true });
    const me = await (await meGET()).json();
    expect(me).toMatchObject({ configured: true, signedIn: true, member: { ageBand: '13_14', canStore: true } });
  });
});

describe('the Clerk webhook', () => {
  it('refuses without a signing secret, and refuses a bad signature', async () => {
    const { POST } = await import('../../src/app/api/clerk/webhook/route');
    vi.stubEnv('CLERK_WEBHOOK_SIGNING_SECRET', '');
    expect((await POST(new Request('http://site.test/api/clerk/webhook', { method: 'POST', body: '{}' }))).status).toBe(503);
    vi.stubEnv('CLERK_WEBHOOK_SIGNING_SECRET', 'whsec_' + Buffer.from('0123456789abcdef0123456789abcdef').toString('base64'));
    const forged = new Request('http://site.test/api/clerk/webhook', {
      method: 'POST',
      headers: { 'svix-id': 'msg_1', 'svix-timestamp': String(Math.floor(Date.now() / 1000)), 'svix-signature': 'v1,bm90IGEgc2lnbmF0dXJl' },
      body: JSON.stringify({ type: 'user.deleted', data: { id: 'user_1' } }),
    });
    expect((await POST(forged)).status).toBe(400);
    vi.unstubAllEnvs();
  });
});

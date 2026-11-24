// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Payload } from 'payload';
import { decryptBytes, decryptText, deleteToken, encryptText, isEncrypted, verifyDeleteToken } from '../../src/lib/cases/crypto';
import { deleteCase, openCase, purgeCaseFiles, type Intake } from '../../src/lib/cases/intake';
import { nextWeekStart, weekKey } from '../../src/lib/cases/week';
import { recordStats } from '../../src/lib/rater/stats';
import { rate } from '../../src/lib/rater/engine';
import { Cases } from '../../src/payload/collections/cases';
import { adultDoc, make, minorDoc, RATED_ON } from '../fixtures/rater';

/** Escalations, storage and the anonymous counts — with an in-memory database. */

const KEY = Buffer.alloc(32, 7).toString('base64');

beforeEach(() => {
  vi.stubEnv('CASE_FILES_KEY', KEY);
  vi.stubEnv('CASE_TOKEN_SECRET', 'test-secret-not-used-anywhere-else');
});
afterEach(() => vi.unstubAllEnvs());

type Row = Record<string, unknown> & { id: number };
function fakePayload() {
  const tables = { cases: [] as Row[], 'rater-stats': [] as Row[], users: [] as Row[] };
  const table = (name: string): Row[] => (tables as Record<string, Row[]>)[name]!;
  const match = (row: Row, where: Record<string, unknown>): boolean =>
    Object.entries(where).every(([key, cond]) => {
      if (key === 'and') return (cond as Record<string, unknown>[]).every((w) => match(row, w));
      if (key === 'or') return (cond as Record<string, unknown>[]).some((w) => match(row, w));
      const c = cond as { equals?: unknown; exists?: boolean; less_than_equal?: string };
      if ('equals' in c) return row[key] === c.equals;
      if ('exists' in c) return c.exists ? row[key] !== null && row[key] !== undefined : row[key] === null || row[key] === undefined;
      if ('less_than_equal' in c) return String(row[key] ?? '') <= String(c.less_than_equal) && row[key] != null;
      return true;
    });
  const api = {
    tables,
    count: async ({ collection, where }: { collection: string; where: Record<string, unknown> }) => ({ totalDocs: table(collection).filter((r) => match(r, where)).length }),
    find: async ({ collection, where }: { collection: string; where: Record<string, unknown> }) => ({ docs: table(collection).filter((r) => match(r, where)) }),
    create: async ({ collection, data }: { collection: string; data: Record<string, unknown> }) => {
      const row = { id: table(collection).length + 1, ...data };
      table(collection).push(row);
      return row;
    },
    update: async ({ collection, id, data }: { collection: string; id: number; data: Record<string, unknown> }) => Object.assign(table(collection).find((r) => r.id === id)!, data),
    delete: async ({ collection, id }: { collection: string; id: number }) => {
      (tables as Record<string, Row[]>)[collection] = table(collection).filter((r) => r.id !== id);
    },
  };
  return api as typeof api & Payload;
}

const memoryStore = () => {
  const objects = new Map<string, Uint8Array>();
  return { objects, put: async (k: string, b: Uint8Array) => void objects.set(k, b), delete: async (k: string) => void objects.delete(k) };
};

const intake: Intake = {
  contactMethod: 'phone',
  contact: '9911 2233',
  bestTime: 'evening',
  description: 'Шөнө ажиллуулдаг',
  consentToContact: true,
  storeFile: false,
  guardianConsent: false,
  deleteEmail: null,
  text: null,
};

const red = (change: (f: ReturnType<typeof minorDoc>) => void) => ({ fields: make(minorDoc, change) });
const p1 = red((f) => (f.injured = true));
const p2 = red((f) => {
  f.schedule.start_time = '17:30';
  f.schedule.end_time = '22:30';
});
const p3 = red((f) => (f.schedule.roster_work = true));

describe('encryption and delete tokens', () => {
  it('round-trips, and no two ciphertexts of the same text are alike', async () => {
    const a = await encryptText('9911 2233');
    const b = await encryptText('9911 2233');
    expect(isEncrypted(a)).toBe(true);
    expect(a).not.toBe(b);
    expect(a).not.toContain('9911');
    expect(await decryptText(a)).toBe('9911 2233');
  });

  it('refuses tampered ciphertext', async () => {
    const sealed = await encryptText('x');
    const tampered = sealed.slice(0, -4) + (sealed.endsWith('AAAA') ? 'BBBB' : 'AAAA');
    await expect(decryptText(tampered)).rejects.toThrow();
  });

  it('a token works for its own case only', async () => {
    const token = await deleteToken('AZ-202648-ABCD');
    expect(await verifyDeleteToken(token)).toBe('AZ-202648-ABCD');
    expect(await verifyDeleteToken(token.replace('ABCD', 'ABCE'))).toBeNull();
    expect(await verifyDeleteToken('AZ-202648-ABCD.forged')).toBeNull();
  });
});

describe('the caseworkers\' week (Monday–Sunday, Ulaanbaatar)', () => {
  it('turns over at Monday 00:00 in Ulaanbaatar, not in UTC', () => {
    // Sunday 23:59 UB = Sunday 15:59 UTC; Monday 00:00 UB = Sunday 16:00 UTC.
    expect(weekKey(new Date('2026-11-29T15:59:00Z'))).toBe('2026-W48');
    expect(weekKey(new Date('2026-11-29T16:00:00Z'))).toBe('2026-W49');
    expect(nextWeekStart(new Date('2026-11-25T03:00:00Z'))).toBe('2026-11-30');
  });
});

describe('opening a case', () => {
  const now = new Date('2026-11-25T03:00:00Z');

  it('only a red result can open a case, and the priority is the server\'s own', async () => {
    const payload = fakePayload();
    expect(await openCase(payload, { fields: adultDoc() }, intake, { store: null, memberClerkId: null, now })).toEqual({ accepted: false, reason: 'not_red' });
    const result = await openCase(payload, p2, intake, { store: null, memberClerkId: null, now, alert: vi.fn() });
    expect(result).toMatchObject({ accepted: true, priority: 'P2', overCapacity: false });
    const row = payload.tables.cases[0]!;
    expect(row.deadline).toBe(new Date(now.getTime() + 72 * 3_600_000).toISOString());
    expect(row.failedRules).toEqual(['M04_NIGHT_WORK']);
  });

  it('over 20 a week: P1 always, P2 flagged, P3 gets the self-help kit and next Monday', async () => {
    const payload = fakePayload();
    for (let i = 0; i < 20; i += 1) payload.tables.cases.push({ id: i + 1, weekKey: weekKey(now) });
    const alert = vi.fn();
    expect(await openCase(payload, p1, intake, { store: null, memberClerkId: null, now, alert })).toMatchObject({ accepted: true, priority: 'P1', overCapacity: true });
    expect(alert).toHaveBeenCalledOnce();
    expect(await openCase(payload, p2, intake, { store: null, memberClerkId: null, now, alert })).toMatchObject({ accepted: true, priority: 'P2', overCapacity: true });
    expect(await openCase(payload, p3, intake, { store: null, memberClerkId: null, now, alert })).toEqual({ accepted: false, reason: 'over_capacity', selfHelp: true, askAgainFrom: '2026-11-30' });
    expect(alert).toHaveBeenCalledOnce();
  });

  it('stores a file only on opt-in: redacted, then encrypted, with a 90-day deletion date', async () => {
    const payload = fakePayload();
    const store = memoryStore();
    await openCase(payload, p2, { ...intake, storeFile: false, text: 'АС 12345678' }, { store, memberClerkId: null, now, alert: vi.fn() });
    expect(store.objects.size).toBe(0);

    const text = 'Ажилтан АС 12345678, утас 99112233. Ажлын цаг 17:30-22:30.';
    // A minor's file needs a guardian's consent; without it the case opens with no file.
    const noGuardian = await openCase(payload, p2, { ...intake, storeFile: true, guardianConsent: false, text }, { store, memberClerkId: null, now, alert: vi.fn() });
    expect(noGuardian).toMatchObject({ accepted: true, fileStored: false });
    expect(store.objects.size).toBe(0);
    payload.tables.cases.pop();

    await openCase(payload, p2, { ...intake, storeFile: true, guardianConsent: true, text }, { store, memberClerkId: 'user_1', now, alert: vi.fn() });
    const [key, sealed] = [...store.objects.entries()][0]!;
    expect(key).toMatch(/^cases\/[0-9a-f-]{36}\.bin$/);
    expect(new TextDecoder().decode(sealed)).not.toContain('17:30');
    const opened = new TextDecoder().decode(await decryptBytes(new Uint8Array(sealed)));
    expect(opened).toContain('17:30-22:30');
    expect(opened).not.toContain('12345678');
    expect(opened).not.toContain('99112233');
    const row = payload.tables.cases[1]!;
    expect(row).toMatchObject({ storeFile: true, fileKey: key, memberClerkId: 'user_1' });
    expect(row.fileDeleteAt).toBe(new Date(now.getTime() + 90 * 86_400_000).toISOString());
  });

  it('the delete link deletes the case and its file; the daily purge removes expired and closed files', async () => {
    const payload = fakePayload();
    const store = memoryStore();
    const opened = await openCase(payload, p2, { ...intake, storeFile: true, guardianConsent: true, text: 'Ажлын цаг 17:30-22:30, долоо хоногт 5 өдөр.' }, { store, memberClerkId: null, now, alert: vi.fn() });
    if (!opened.accepted) throw new Error('expected a case');
    expect(store.objects.size).toBe(1);
    expect(await deleteCase(payload, opened.caseId, store)).toBe(true);
    expect(payload.tables.cases).toEqual([]);
    expect(store.objects.size).toBe(0);

    payload.tables.cases.push(
      { id: 10, fileKey: 'a', fileDeleteAt: '2026-01-01T00:00:00.000Z', status: 'new' },
      { id: 11, fileKey: 'b', fileDeleteAt: '2027-12-01T00:00:00.000Z', status: 'closed' },
      { id: 12, fileKey: 'c', fileDeleteAt: '2027-12-01T00:00:00.000Z', status: 'contacted' },
    );
    for (const k of ['a', 'b', 'c']) store.objects.set(k, new Uint8Array([1]));
    expect(await purgeCaseFiles(payload, store, now)).toBe(2);
    expect([...store.objects.keys()]).toEqual(['c']);
  });
});

describe('the Cases collection', () => {
  const [beforeChange] = Cases.hooks!.beforeChange!;
  const [afterRead] = Cases.hooks!.afterRead!;

  it('encrypts the contact and the description before they are stored', async () => {
    const data = await beforeChange!({ data: { contact: '9911 2233', description: 'тайлбар', status: 'new' } } as never);
    expect(isEncrypted(data.contact)).toBe(true);
    expect(isEncrypted(data.description)).toBe(true);
    expect(data.status).toBe('new');
  });

  it('decrypts only for a caseworker, and writes an access-log row for every case opened', async () => {
    const stored = { id: 5, contact: await encryptText('9911 2233'), description: await encryptText('тайлбар') };
    const create = vi.fn();
    const asEditor = await afterRead!({ doc: { ...stored }, findMany: false, req: { user: { id: 1, role: 'editor' }, payload: { create } } } as never);
    expect(asEditor.contact).toBe('••••');
    expect(create).not.toHaveBeenCalled();

    const asCaseworker = await afterRead!({ doc: { ...stored }, findMany: false, req: { user: { id: 2, role: 'caseworker' }, payload: { create } } } as never);
    expect(asCaseworker.contact).toBe('9911 2233');
    expect(create).toHaveBeenCalledWith(expect.objectContaining({ collection: 'case-access-log', data: expect.objectContaining({ case: 5, user: 2, action: 'view' }) }));

    create.mockClear();
    await afterRead!({ doc: { ...stored }, findMany: true, req: { user: { id: 2, role: 'caseworker' }, payload: { create } } } as never);
    expect(create).not.toHaveBeenCalled();
  });

  it('is closed to everyone but caseworkers', () => {
    const read = Cases.access!.read as (a: { req: { user: unknown } }) => boolean;
    expect(read({ req: { user: { role: 'admin' } } })).toBe(false);
    expect(read({ req: { user: { role: 'editor' } } })).toBe(false);
    expect(read({ req: { user: null } })).toBe(false);
    expect(read({ req: { user: { role: 'caseworker' } } })).toBe(true);
  });
});

describe('anonymous counts', () => {
  it('add one per rule to shared rows, holding nothing that identifies a rating', async () => {
    const payload = fakePayload();
    const fields = minorDoc();
    const rating = rate(fields, RATED_ON);
    await recordStats(payload, rating, fields);
    await recordStats(payload, rating, fields);
    const rows = payload.tables['rater-stats'];
    expect(rows.length).toBe(rating.results.length);
    for (const row of rows) {
      expect(row.count).toBe(2);
      expect(Object.keys(row).sort()).toEqual(['ageBand', 'aimag', 'count', 'employerKind', 'id', 'jobCategory', 'month', 'result', 'ruleId', 'ruleSetVersion']);
      expect(row.month).toBe('2026-11');
    }
    expect(JSON.stringify(rows)).not.toContain('2010-03-14');
  });
});

// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const revalidateTag = vi.fn();
vi.mock('next/cache', () => ({
  revalidateTag: (tag: string, profile: string) => revalidateTag(tag, profile),
}));

const { GET, POST } = await import('../../src/app/api/revalidate/route');

const post = (headers: Record<string, string> = {}) =>
  POST(new Request('https://example.org/api/revalidate', { method: 'POST', headers }));

const get = (headers: Record<string, string> = {}) =>
  GET(new Request('https://example.org/api/revalidate', { headers }));

beforeEach(() => {
  vi.clearAllMocks();
  process.env.REVALIDATE_SECRET = 'correct-horse';
  process.env.CRON_SECRET = 'battery-staple';
});

afterEach(() => {
  delete process.env.REVALIDATE_SECRET;
  delete process.env.CRON_SECRET;
});

describe('POST /api/revalidate', () => {
  it('revalidates the impact tag with the right secret', async () => {
    const response = await post({ 'x-revalidate-secret': 'correct-horse' });

    expect(response.status).toBe(200);
    expect(revalidateTag).toHaveBeenCalledWith('impact', 'max');
    await expect(response.json()).resolves.toMatchObject({
      revalidated: true,
      tag: 'impact',
    });
  });

  it('refuses a wrong secret', async () => {
    const response = await post({ 'x-revalidate-secret': 'wrong' });

    expect(response.status).toBe(401);
    expect(revalidateTag).not.toHaveBeenCalled();
  });

  it('refuses a missing header', async () => {
    expect((await post()).status).toBe(401);
    expect(revalidateTag).not.toHaveBeenCalled();
  });

  it('does not accept the cron secret on this route', async () => {
    expect((await post({ 'x-revalidate-secret': 'battery-staple' })).status).toBe(401);
  });

  it('answers 503 rather than opening up when no secret is configured', async () => {
    delete process.env.REVALIDATE_SECRET;
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const response = await post({ 'x-revalidate-secret': 'anything' });
    expect(response.status).toBe(503);
    expect(revalidateTag).not.toHaveBeenCalled();
    spy.mockRestore();
  });
});

describe('GET /api/revalidate (Vercel cron)', () => {
  it('accepts the cron bearer token', async () => {
    const response = await get({ authorization: 'Bearer battery-staple' });

    expect(response.status).toBe(200);
    expect(revalidateTag).toHaveBeenCalledWith('impact', 'max');
  });

  it('refuses a wrong token, a bare token and no header', async () => {
    expect((await get({ authorization: 'Bearer nope' })).status).toBe(401);
    expect((await get({ authorization: 'battery-staple' })).status).toBe(401);
    expect((await get()).status).toBe(401);
    expect(revalidateTag).not.toHaveBeenCalled();
  });

  it('does not accept the manual secret on the cron route', async () => {
    expect((await get({ authorization: 'Bearer correct-horse' })).status).toBe(401);
  });

  it('never caches its answer', async () => {
    const response = await get({ authorization: 'Bearer battery-staple' });
    expect(response.headers.get('cache-control')).toBe('no-store');
  });
});

/**
 * Rate limiting for the rater endpoints, the same code on Node and Workers.
 *
 * A fixed window per client, counted in memory. The client is a hash of the
 * IP address with a random salt made when the instance starts, so the
 * address itself is never kept, and the hash means nothing after a restart.
 *
 * ponytail: per-instance counts. On Workers each isolate counts on its own,
 * so the real ceiling is limit × isolates. Upgrade path: the Workers Rate
 * Limiting binding, or a shared store, if abuse shows up.
 */

const SALT = crypto.getRandomValues(new Uint8Array(16));
const windows = new Map<string, { start: number; count: number }>();

async function clientKey(request: Request, scope: string): Promise<string> {
  const ip =
    request.headers.get('cf-connecting-ip') ??
    request.headers.get('x-real-ip') ??
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    'unknown';
  const data = new Uint8Array([...SALT, ...new TextEncoder().encode(`${scope}:${ip}`)]);
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', data));
  return Array.from(digest.slice(0, 12), (b) => b.toString(16).padStart(2, '0')).join('');
}

export const LIMITS = {
  extract: { limit: 10, windowMs: 10 * 60_000 },
  rate: { limit: 60, windowMs: 10 * 60_000 },
  message: { limit: 10, windowMs: 10 * 60_000 },
  template: { limit: 30, windowMs: 10 * 60_000 },
  cases: { limit: 5, windowMs: 60 * 60_000 },
} as const;

/** null when allowed; a 429 response when the client is over its limit. */
export async function limit(request: Request, scope: keyof typeof LIMITS, now = Date.now()): Promise<Response | null> {
  if (process.env.RATE_LIMIT_DISABLED === 'true') return null;
  const { limit: max, windowMs } = LIMITS[scope];
  const key = await clientKey(request, scope);
  const entry = windows.get(key);
  if (!entry || now - entry.start >= windowMs) {
    windows.set(key, { start: now, count: 1 });
    if (windows.size > 50_000) {
      for (const [k, w] of windows) if (now - w.start >= windowMs) windows.delete(k);
    }
    return null;
  }
  entry.count += 1;
  if (entry.count <= max) return null;
  const retry = Math.ceil((entry.start + windowMs - now) / 1000);
  return Response.json({ error: 'rate_limited' }, { status: 429, headers: { 'retry-after': String(retry), 'cache-control': 'no-store' } });
}

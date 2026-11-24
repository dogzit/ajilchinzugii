import type { z } from 'zod';

/**
 * Small pieces every rater endpoint shares. Nothing here logs a request or
 * echoes one back: a contract, a CV or an answer never reaches a log line or
 * an error message (spec, "Never write contract text into application logs").
 */

const NO_STORE = { 'cache-control': 'no-store' };

export const json = (data: unknown, status = 200): Response =>
  Response.json(data, { status, headers: NO_STORE });

export const problem = (code: string, status: number): Response => json({ error: code }, status);

/** Today in Ulaanbaatar, YYYY-MM-DD: the rating date that picks the rule parameters. */
export function todayInUlaanbaatar(now = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ulaanbaatar' }).format(now);
}

/** Parse and validate a JSON body. Errors say only that the shape was wrong, never what was in it. */
export async function readJson<T>(
  request: Request,
  schema: z.ZodType<T>,
  maxBytes = 256_000,
): Promise<{ ok: true; data: T } | { ok: false; response: Response }> {
  const length = Number(request.headers.get('content-length') ?? 0);
  if (length > maxBytes) return { ok: false, response: problem('too_large', 413) };
  let raw: string;
  try {
    raw = await request.text();
  } catch {
    return { ok: false, response: problem('unreadable', 400) };
  }
  if (raw.length > maxBytes) return { ok: false, response: problem('too_large', 413) };
  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return { ok: false, response: problem('invalid_json', 400) };
  }
  const parsed = schema.safeParse(body);
  return parsed.success ? { ok: true, data: parsed.data } : { ok: false, response: problem('invalid_fields', 422) };
}

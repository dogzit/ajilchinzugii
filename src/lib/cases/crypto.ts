/**
 * Encryption for opted-in case data (ADR §5). AES-256-GCM through WebCrypto,
 * the same on Node and Workers; a fresh 96-bit IV for every value; the key
 * from CASE_FILES_KEY (32 bytes, base64). Delete links are signed with
 * HMAC-SHA256 and CASE_TOKEN_SECRET.
 *
 * Without the key nothing personal can be stored, so the intake refuses
 * rather than keeping it in the clear.
 */

const PREFIX = 'enc:v1:';
const enc = new TextEncoder();
const dec = new TextDecoder();

const b64 = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes));
const unb64 = (text: string): Uint8Array<ArrayBuffer> => Uint8Array.from(atob(text), (c) => c.charCodeAt(0));
const b64url = (bytes: Uint8Array) => b64(bytes).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

export function casesConfigured(env: Record<string, string | undefined> = process.env): boolean {
  try {
    return Boolean(env.CASE_TOKEN_SECRET?.trim()) && unb64(env.CASE_FILES_KEY?.trim() ?? '').length === 32;
  } catch {
    return false;
  }
}

async function key(): Promise<CryptoKey> {
  const raw = unb64(process.env.CASE_FILES_KEY?.trim() ?? '');
  if (raw.length !== 32) throw new Error('CASE_FILES_KEY must be 32 bytes, base64');
  return crypto.subtle.importKey('raw', raw, 'AES-GCM', false, ['encrypt', 'decrypt']);
}

export const isEncrypted = (value: unknown): value is string => typeof value === 'string' && value.startsWith(PREFIX);

export async function encryptBytes(plain: Uint8Array<ArrayBuffer>): Promise<Uint8Array<ArrayBuffer>> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const sealed = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await key(), plain));
  const out = new Uint8Array(iv.length + sealed.length);
  out.set(iv);
  out.set(sealed, iv.length);
  return out;
}

export async function decryptBytes(sealed: Uint8Array<ArrayBuffer>): Promise<Uint8Array<ArrayBuffer>> {
  return new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: sealed.slice(0, 12) }, await key(), sealed.slice(12)));
}

export async function encryptText(plain: string): Promise<string> {
  return PREFIX + b64(await encryptBytes(enc.encode(plain)));
}

export async function decryptText(value: string): Promise<string> {
  if (!isEncrypted(value)) return value;
  return dec.decode(await decryptBytes(unb64(value.slice(PREFIX.length))));
}

async function hmac(message: string): Promise<string> {
  const secret = process.env.CASE_TOKEN_SECRET?.trim();
  if (!secret) throw new Error('CASE_TOKEN_SECRET is not set');
  const k = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return b64url(new Uint8Array(await crypto.subtle.sign('HMAC', k, enc.encode(message))));
}

/** A delete link's token: the case id and its signature. Carries nothing about the person. */
export async function deleteToken(caseId: string): Promise<string> {
  return `${caseId}.${await hmac(`delete:${caseId}`)}`;
}

/** The case id a token was made for, or null if it was not made here. */
export async function verifyDeleteToken(token: string): Promise<string | null> {
  const dot = token.lastIndexOf('.');
  if (dot < 1) return null;
  const caseId = token.slice(0, dot);
  const expected = await hmac(`delete:${caseId}`);
  const given = token.slice(dot + 1);
  if (given.length !== expected.length) return null;
  let diff = 0;
  for (let i = 0; i < given.length; i += 1) diff |= given.charCodeAt(i) ^ expected.charCodeAt(i);
  return diff === 0 ? caseId : null;
}

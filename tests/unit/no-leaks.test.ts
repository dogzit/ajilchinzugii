// @vitest-environment node
import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { POST as extractPOST } from '../../src/app/api/rater/extract/route';
import { POST as messagePOST } from '../../src/app/api/rater/message/route';
import { POST as ratePOST } from '../../src/app/api/rater/rate/route';
import { anthropicExtractor } from '../../src/lib/extraction/extractor';
import { extractContract } from '../../src/lib/extraction/service';
import { logEvent } from '../../src/lib/log';
import { minorDoc } from '../fixtures/rater';

/**
 * Contract and CV text, extracted values and model payloads must never reach
 * a log, an error or a response that echoes them (spec, "Never write contract
 * text into application logs"; CLAUDE.md rule 4). Every path that handles
 * them runs here with a canary in the text, and every byte written to the
 * console, stdout and stderr is searched for it.
 */

const CANARY = 'КАНАРЫ Жишээбаатар';
const CANARY_LATIN = 'CanaryLatinName';
const REGISTER = 'ЖШ 12345678';
const PHONE = '9911 2233';
const contract = `${readFileSync('tests/fixtures/contracts/01-cafe-printed.txt', 'utf8')}\nАжилтны нэр: ${CANARY} (${CANARY_LATIN}), ${REGISTER}, утас ${PHONE}`;

let written: string[] = [];

beforeEach(() => {
  written = [];
  const capture = (...args: unknown[]) => {
    written.push(args.map((a) => (typeof a === 'string' ? a : JSON.stringify(a, Object.getOwnPropertyNames(a ?? {})))).join(' '));
  };
  for (const method of ['log', 'info', 'warn', 'error', 'debug'] as const) vi.spyOn(console, method).mockImplementation(capture);
  vi.spyOn(process.stdout, 'write').mockImplementation((chunk: string | Uint8Array) => {
    written.push(String(chunk));
    return true;
  });
  vi.spyOn(process.stderr, 'write').mockImplementation((chunk: string | Uint8Array) => {
    written.push(String(chunk));
    return true;
  });
});

afterEach(() => {
  const all = written.join('\n');
  expect(all).not.toContain('КАНАРЫ');
  expect(all).not.toContain(CANARY_LATIN);
  expect(all).not.toContain('12345678');
  expect(all).not.toContain('7,000');
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

const json = (body: unknown) => ({ method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });

describe('nothing personal reaches a log', () => {
  it('a successful extraction', async () => {
    vi.stubEnv('RATER_EXTRACTOR', 'mock');
    const response = await extractPOST(new Request('http://x/api/rater/extract', json({ text: contract })));
    expect(response.status).toBe(200);
    // The response holds the redacted text only.
    const body = await response.text();
    expect(body).not.toContain('12345678');
    expect(body).not.toContain('9911');
  });

  it('a failed extraction, where the provider error quotes the request', async () => {
    vi.stubEnv('RATER_EXTRACTOR', '');
    vi.stubEnv('ANTHROPIC_API_KEY', 'test-key');
    vi.stubEnv('ANTHROPIC_MODEL', 'test-model');
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => Response.json({ type: 'error', error: { type: 'invalid_request_error', message: `bad input near ${CANARY}` } }, { status: 400 })),
    );
    const response = await extractPOST(new Request('http://x/api/rater/extract', json({ text: contract })));
    expect(response.status).toBe(503);
    expect(await response.text()).not.toContain('КАНАРЫ');
  });

  it('an extractor that throws with the document in its message', async () => {
    const throwing = { extract: async () => Promise.reject(new Error(`could not parse: ${contract}`)) };
    const error = await extractContract(contract, throwing).catch((e: Error) => e);
    expect(String(error)).not.toContain('КАНАРЫ');
    console.error(error);
  });

  it('the corrected-fields log keeps known field names and drops everything else', async () => {
    await ratePOST(new Request('http://x/api/rater/rate', json({ fields: minorDoc(), corrected: ['pay.amount', CANARY_LATIN, CANARY] })));
    expect(written.join('\n')).toContain('pay.amount');
  });

  it('the logger itself refuses free text', () => {
    logEvent('extraction_failed', { code: CANARY_LATIN, kind: 'contract', note: CANARY, n: 3 });
    expect(written.join('\n')).toContain('"kind":"contract"');
  });

  it('the employer message sends the model rule texts, never the fields', async () => {
    vi.stubEnv('ANTHROPIC_API_KEY', 'test-key');
    vi.stubEnv('ANTHROPIC_MODEL', 'test-model');
    const sent: string[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (_url: unknown, init?: RequestInit) => {
        sent.push(String(init?.body));
        return Response.json({ type: 'error', error: { type: 'api_error', message: 'x' } }, { status: 500 });
      }),
    );
    const fields = minorDoc();
    fields.job.title = CANARY;
    fields.pay.amount = 0;
    const response = await messagePOST(new Request('http://x/api/rater/message', json({ fields })));
    expect(response.status).toBe(200);
    expect(sent.join('\n')).not.toContain('КАНАРЫ');
    expect(sent.join('\n')).not.toContain('2010-03-14');
  });
});

describe('the model only ever sees redacted text', () => {
  it('register and phone numbers are gone before the request is made', async () => {
    const sent: string[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (_url: unknown, init?: RequestInit) => {
        sent.push(String(init?.body));
        return Response.json({ type: 'error', error: { type: 'api_error', message: 'x' } }, { status: 500 });
      }),
    );
    await extractContract(contract, anthropicExtractor({ apiKey: 'test-key', model: 'test-model' })).catch(() => null);
    expect(sent.length).toBeGreaterThan(0);
    const payload = sent.join('\n');
    expect(payload).not.toContain('12345678');
    expect(payload).not.toContain('9911');
    expect(payload).toContain('[ID]');
    expect(payload).toContain('[PHONE]');
    expect(payload).not.toMatch(/"temperature"/);
  });
});

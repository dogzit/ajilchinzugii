// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const jwtOptions = vi.fn();
vi.mock('google-auth-library', () => ({
  JWT: class {
    constructor(options: unknown) {
      jwtOptions(options);
    }
    async getAccessToken() {
      return { token: 'test-token' };
    }
  },
}));

const {
  fetchSheetValues,
  ImpactConfigError,
  ImpactFetchError,
  MONTHLY_RANGE,
  TOTALS_RANGE,
} = await import('../../src/lib/impact/client').then(async (mod) => ({
  ...mod,
  ...(await import('../../src/lib/impact/schema')),
}));

const okBody = {
  valueRanges: [
    { range: 'Totals!A1:H2', values: [['metric_id']] },
    { range: 'Monthly!A1:D2', values: [['month']] },
  ],
};

let fetchMock: ReturnType<typeof vi.fn>;

const lastUrl = () => new URL(String(fetchMock.mock.calls[0]?.[0]));

beforeEach(() => {
  vi.clearAllMocks();
  process.env.GOOGLE_SA_EMAIL = 'reader@example.iam.gserviceaccount.com';
  process.env.GOOGLE_SA_PRIVATE_KEY =
    '-----BEGIN PRIVATE KEY-----\\nabc\\n-----END PRIVATE KEY-----\\n';
  process.env.IMPACT_SHEET_ID = 'sheet-123';

  fetchMock = vi.fn(async () => new Response(JSON.stringify(okBody), { status: 200 }));
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  delete process.env.GOOGLE_SA_EMAIL;
  delete process.env.GOOGLE_SA_PRIVATE_KEY;
  delete process.env.IMPACT_SHEET_ID;
});

describe('what the client is allowed to read', () => {
  it('asks for the two contract ranges and nothing else', async () => {
    await fetchSheetValues();

    expect(lastUrl().searchParams.getAll('ranges')).toEqual([
      TOTALS_RANGE,
      MONTHLY_RANGE,
    ]);
    expect([TOTALS_RANGE, MONTHLY_RANGE]).toEqual(['Totals!A:H', 'Monthly!A:D']);
  });

  it('takes no arguments, so a caller cannot widen the request', () => {
    // The ranges are module constants. There is no parameter to pass another
    // tab through, which is the code-side half of CLAUDE.md rule 3.
    expect(fetchSheetValues.length).toBe(0);
  });

  it('requests the read-only scope', async () => {
    await fetchSheetValues();

    expect(jwtOptions).toHaveBeenCalledWith(
      expect.objectContaining({
        scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
      }),
    );
  });

  it('reads only the configured spreadsheet', async () => {
    await fetchSheetValues();

    expect(lastUrl().pathname).toBe('/v4/spreadsheets/sheet-123/values:batchGet');
  });

  it('restores the newlines of a PEM key stored with \\n escapes', async () => {
    await fetchSheetValues();

    const options = jwtOptions.mock.calls[0]?.[0] as { key: string };
    expect(options.key).toContain('-----BEGIN PRIVATE KEY-----\n');
    expect(options.key).not.toContain('\\n');
  });

  it('caches for a day under the impact tag', async () => {
    await fetchSheetValues();

    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({
      next: { revalidate: 86_400, tags: ['impact'] },
    });
  });

  it('sends the token as a bearer header, never in the URL', async () => {
    await fetchSheetValues();

    const init = fetchMock.mock.calls[0]?.[1] as { headers: Record<string, string> };
    expect(init.headers.Authorization).toBe('Bearer test-token');
    expect(lastUrl().search).not.toContain('test-token');
  });
});

describe('when something is wrong', () => {
  it('refuses to run without credentials, naming only the variables', async () => {
    delete process.env.IMPACT_SHEET_ID;

    await expect(fetchSheetValues()).rejects.toBeInstanceOf(ImpactConfigError);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('reports the status of a rejected request without its body', async () => {
    // A Sheets error body can quote the cell that caused it.
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({ error: { message: 'Unable to parse range: Хэрэг 42' } }),
        {
          status: 403,
        },
      ),
    );

    const error = await fetchSheetValues().catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ImpactFetchError);
    expect((error as Error).message).toBe('Sheets API responded 403');
    expect((error as Error).message).not.toContain('Хэрэг');
  });

  it('rejects a response that does not carry both ranges', async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ valueRanges: [{ values: [] }] }), { status: 200 }),
    );

    await expect(fetchSheetValues()).rejects.toThrow(/expected 2 ranges/);
  });
});

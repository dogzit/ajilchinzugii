import { JWT } from 'google-auth-library';
import { MONTHLY_RANGE, TOTALS_RANGE } from './schema';

/**
 * Read-only access to the public totals spreadsheet.
 *
 * Three limits are deliberate and enforced here rather than by convention
 * (CLAUDE.md rule 3 — case-level data never leaves the sheet):
 *  - the scope is `spreadsheets.readonly`, so these credentials cannot write;
 *  - exactly two ranges are requested, and they are constants, not arguments,
 *    so no other tab of the spreadsheet can be read through this module;
 *  - nothing in here logs a cell. Errors carry a type and a timestamp only.
 */

const SHEETS_SCOPE = 'https://www.googleapis.com/auth/spreadsheets.readonly';
const SHEETS_API = 'https://sheets.googleapis.com/v4/spreadsheets';

/** One day, matching the ISR window for the impact pages. */
export const IMPACT_REVALIDATE_SECONDS = 86_400;
export const IMPACT_CACHE_TAG = 'impact';

export type SheetValues = {
  totals?: unknown[][];
  monthly?: unknown[][];
};

export class ImpactConfigError extends Error {
  readonly kind = 'config';
}

export class ImpactFetchError extends Error {
  readonly kind = 'fetch';
  readonly status: number | undefined;

  constructor(message: string, status?: number) {
    super(message);
    this.status = status;
  }
}

type SheetCredentials = {
  email: string;
  privateKey: string;
  sheetId: string;
};

function readCredentials(): SheetCredentials {
  const email = process.env.GOOGLE_SA_EMAIL;
  const sheetId = process.env.IMPACT_SHEET_ID;
  // Dashboards and .env files store the PEM with escaped newlines.
  const privateKey = process.env.GOOGLE_SA_PRIVATE_KEY?.replace(/\\n/g, '\n');

  const missing = [
    !email && 'GOOGLE_SA_EMAIL',
    !privateKey && 'GOOGLE_SA_PRIVATE_KEY',
    !sheetId && 'IMPACT_SHEET_ID',
  ].filter(Boolean);

  if (missing.length > 0) {
    throw new ImpactConfigError(`missing environment variables: ${missing.join(', ')}`);
  }

  return {
    email: email as string,
    privateKey: privateKey as string,
    sheetId: sheetId as string,
  };
}

/**
 * Mints a short-lived access token. google-auth-library keeps its own cache,
 * so this does not hit Google on every call.
 */
async function accessToken({ email, privateKey }: SheetCredentials): Promise<string> {
  const jwt = new JWT({ email, key: privateKey, scopes: [SHEETS_SCOPE] });
  const { token } = await jwt.getAccessToken();

  if (!token) {
    throw new ImpactFetchError('the service account returned no access token');
  }
  return token;
}

/**
 * Reads both tabs in one request.
 *
 * The response goes through Next's fetch cache (revalidate daily, tag
 * `impact`), so an on-demand revalidation of that tag is what makes a sheet
 * edit show up before the next day.
 */
export async function fetchSheetValues(): Promise<SheetValues> {
  const credentials = readCredentials();
  const token = await accessToken(credentials);

  const url = new URL(
    `${SHEETS_API}/${encodeURIComponent(credentials.sheetId)}/values:batchGet`,
  );
  url.searchParams.append('ranges', TOTALS_RANGE);
  url.searchParams.append('ranges', MONTHLY_RANGE);
  url.searchParams.set('majorDimension', 'ROWS');
  // Read the underlying numbers, not what the sheet's locale formats them as.
  url.searchParams.set('valueRenderOption', 'UNFORMATTED_VALUE');
  url.searchParams.set('dateTimeRenderOption', 'FORMATTED_STRING');

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
    next: { revalidate: IMPACT_REVALIDATE_SECONDS, tags: [IMPACT_CACHE_TAG] },
  });

  if (!response.ok) {
    // The body can quote cell contents, so only the status is kept.
    throw new ImpactFetchError(
      `Sheets API responded ${response.status}`,
      response.status,
    );
  }

  const body = (await response.json()) as {
    valueRanges?: { range?: string; values?: unknown[][] }[];
  };

  const ranges = body.valueRanges ?? [];
  if (ranges.length !== 2) {
    throw new ImpactFetchError(`expected 2 ranges, received ${ranges.length}`);
  }

  // batchGet answers in the order the ranges were requested.
  return { totals: ranges[0]?.values, monthly: ranges[1]?.values };
}

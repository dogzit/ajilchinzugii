import { z } from 'zod';
import { extractorFromEnv } from '@/lib/extraction/extractor';
import { extractContract } from '@/lib/extraction/service';
import { ExtractionError, fileText, MAX_FILE_BYTES } from '@/lib/extraction/text';
import { logEvent } from '@/lib/log';
import { limit } from '@/lib/rate-limit';
import { json, problem } from '@/lib/rater/http';

/**
 * Reads a contract: pasted text or text the phone read from a photo (JSON),
 * or a PDF / Word file (multipart). The text is redacted, sent to the model,
 * checked against its excerpts and returned for the reader to confirm. It is
 * held only for the length of this request.
 */
export const dynamic = 'force-dynamic';

const STATUS: Record<ExtractionError['code'], number> = {
  too_large: 413,
  too_many_pages: 413,
  unsupported_type: 415,
  unreadable: 422,
  no_text: 422,
  llm_unavailable: 503,
  invalid_output: 502,
};

const textBody = z.object({ text: z.string().max(80_000) });

export async function POST(request: Request) {
  const limited = await limit(request, 'extract');
  if (limited) return limited;

  const extractor = await extractorFromEnv();
  if (!extractor) return problem('not_configured', 503);

  const length = Number(request.headers.get('content-length') ?? 0);
  if (length > MAX_FILE_BYTES + 64_000) return problem('too_large', 413);

  try {
    let raw: string;
    let source: 'text' | 'pdf' | 'docx' = 'text';
    if ((request.headers.get('content-type') ?? '').startsWith('multipart/form-data')) {
      const form = await request.formData();
      const file = form.get('file');
      if (!(file instanceof File)) return problem('unsupported_type', 415);
      const doc = await fileText(file);
      raw = doc.text;
      source = file.type === 'application/pdf' || file.name.endsWith('.pdf') ? 'pdf' : 'docx';
    } else {
      const parsed = textBody.safeParse(await request.json().catch(() => null));
      if (!parsed.success) return problem('invalid_fields', 422);
      raw = parsed.data.text;
    }

    const result = await extractContract(raw, extractor);
    if (result.dropped.length) logEvent('extraction_dropped', { kind: 'contract', source, fields: result.dropped });
    return json(result);
  } catch (error) {
    const code = error instanceof ExtractionError ? error.code : 'unreadable';
    logEvent('extraction_failed', { kind: 'contract', code });
    return problem(code, STATUS[code]);
  }
}

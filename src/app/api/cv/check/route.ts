import { z } from 'zod';
import { cvProfileSchema, rateCv } from '@/lib/cv/engine';
import { CV_EVIDENCE_PATHS } from '@/lib/cv/extraction';
import { extractCv } from '@/lib/cv/service';
import { extractorFromEnv } from '@/lib/extraction/extractor';
import { ExtractionError, fileText, MAX_FILE_BYTES } from '@/lib/extraction/text';
import { allowLogWords, logEvent } from '@/lib/log';
import { limit } from '@/lib/rate-limit';
import { json, problem } from '@/lib/rater/http';

/**
 * Reads a CV (pasted text, text the phone read from a photo, or a PDF / Word
 * file) and rates it against the reader's profile. The text is redacted
 * before the model sees it and is dropped when the response is sent; the
 * rating is decided in code from cv-rules.yaml.
 */
export const dynamic = 'force-dynamic';

allowLogWords([...CV_EVIDENCE_PATHS, 'education', 'experience', 'skills', 'languages', 'achievements', 'spelling_issues', 'suggestions']);

const STATUS: Record<ExtractionError['code'], number> = {
  too_large: 413,
  too_many_pages: 413,
  unsupported_type: 415,
  unreadable: 422,
  no_text: 422,
  llm_unavailable: 503,
  invalid_output: 502,
};

const textBody = z.object({ text: z.string().max(80_000), profile: cvProfileSchema });

export async function POST(request: Request) {
  const limited = await limit(request, 'extract');
  if (limited) return limited;
  const extractor = await extractorFromEnv();
  if (!extractor) return problem('not_configured', 503);
  if (Number(request.headers.get('content-length') ?? 0) > MAX_FILE_BYTES + 64_000) return problem('too_large', 413);

  try {
    let raw: string;
    let profile;
    if ((request.headers.get('content-type') ?? '').startsWith('multipart/form-data')) {
      const form = await request.formData();
      const file = form.get('file');
      const parsedProfile = cvProfileSchema.safeParse(JSON.parse(String(form.get('profile') ?? 'null')));
      if (!(file instanceof File) || !parsedProfile.success) return problem('invalid_fields', 422);
      raw = (await fileText(file)).text;
      profile = parsedProfile.data;
    } else {
      const parsed = textBody.safeParse(await request.json().catch(() => null));
      if (!parsed.success) return problem('invalid_fields', 422);
      raw = parsed.data.text;
      profile = parsed.data.profile;
    }
    const { text, cv, dropped, redactions, wordCount } = await extractCv(raw, extractor);
    if (dropped.length) logEvent('extraction_dropped', { kind: 'cv', fields: dropped });
    return json({ text, cv, rating: rateCv({ profile, cv, redactions, wordCount }) });
  } catch (error) {
    const code = error instanceof ExtractionError ? error.code : 'unreadable';
    logEvent('extraction_failed', { kind: 'cv', code });
    return problem(code, STATUS[code]);
  }
}

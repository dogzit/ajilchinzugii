import { getPayload } from 'payload';
import config from '@/payload.config';
import { z } from 'zod';
import { clerkConfigured, currentUserId } from '@/lib/accounts/clerk';
import { casesConfigured } from '@/lib/cases/crypto';
import { caseFileStore } from '@/lib/cases/files';
import { intakeSchema, openCase } from '@/lib/cases/intake';
import { readMailSettings, readResendSettings } from '@/payload/email';
import { limit } from '@/lib/rate-limit';
import { json, problem, readJson } from '@/lib/rater/http';
import { ratingRequestSchema } from '@/lib/rater/request';

/**
 * "Talk to Ajilchin Zugii": the intake form. Works without an account and
 * links to one when the reader is signed in. Contact details and the
 * description are encrypted before they are stored; the document is stored
 * only on an explicit opt-in, redacted and encrypted, in a private bucket.
 */
export const dynamic = 'force-dynamic';

const bodySchema = ratingRequestSchema.extend({ intake: intakeSchema, locale: z.enum(['mn', 'en']) });

export async function POST(request: Request) {
  const limited = await limit(request, 'cases');
  if (limited) return limited;
  if (!casesConfigured()) return problem('not_configured', 503);
  const body = await readJson(request, bodySchema);
  if (!body.ok) return body.response;
  const { intake, locale, ...rating } = body.data;

  const payload = await getPayload({ config });
  const memberClerkId = clerkConfigured() ? await currentUserId().catch(() => null) : null;
  const result = await openCase(payload, rating, intake, { store: caseFileStore(), memberClerkId });
  if (!result.accepted) return json(result);

  // The delete link goes by email only through a real transport (Payload
  // would otherwise write the message, address and all, to the log), and the
  // address is used for this one message, never stored.
  const link = `${process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') ?? ''}/${locale}/case-delete#${result.deleteToken}`;
  if (intake.deleteEmail && (readResendSettings() || readMailSettings())) {
    await payload
      .sendEmail({
        to: intake.deleteEmail,
        subject: 'Ажилчин Зөгий — хэргийн мэдээллээ устгах холбоос / Link to delete your case',
        text: `Таны хэргийн дугаар ${result.caseId}. Мэдээллээ устгах бол энэ холбоосыг нээнэ үү:\n${link}\n\nYour case is ${result.caseId}. To delete what you shared, open:\n${link}`,
      })
      .catch(() => undefined);
  }
  return json({ ...result, deleteLink: link });
}

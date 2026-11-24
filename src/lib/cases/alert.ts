import type { Payload } from 'payload';
import { readMailSettings, readResendSettings } from '../../payload/email';
import { logEvent } from '../log';

/**
 * A new P1 alerts the on-duty caseworkers at once (spec, "Alerts"): by email
 * through the site's existing mail adapter, and by Telegram when a bot is
 * configured. The alert carries the case id, the priority and the deadline —
 * never the contact, the description or anything the person wrote.
 */
export async function alertP1(payload: Payload, input: { caseId: string; deadline: string }, env = process.env): Promise<void> {
  const site = env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') ?? '';
  const text = `P1 хэрэг ${input.caseId} — ${input.deadline}-аас өмнө холбогдоно уу. / P1 case ${input.caseId}: contact before ${input.deadline}. ${site}/admin/collections/cases`;

  // Without a real transport Payload writes mail to the log; even this
  // id-only message is not sent that way.
  if (readResendSettings(env) || readMailSettings(env)) {
    try {
      const { docs } = await payload.find({ collection: 'users', where: { and: [{ role: { equals: 'caseworker' } }, { onDuty: { equals: true } }] }, limit: 20, depth: 0, overrideAccess: true });
      await Promise.all(docs.map((user) => payload.sendEmail({ to: user.email, subject: `P1 — ${input.caseId}`, text })));
    } catch {
      logEvent('case_alert_failed', { kind: 'contract' });
    }
  }

  const token = env.TELEGRAM_BOT_TOKEN?.trim();
  const chat = env.TELEGRAM_CHAT_ID?.trim();
  if (token && chat) {
    try {
      await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ chat_id: chat, text }),
      });
    } catch {
      logEvent('case_alert_failed', { kind: 'contract' });
    }
  }
}

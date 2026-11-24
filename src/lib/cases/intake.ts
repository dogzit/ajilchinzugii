import type { Payload } from 'payload';
import { z } from 'zod';
import { redact } from '../extraction/redact';
import type { RatingRequest } from '../rater/request';
import { rateRequest } from '../rater/request';
import { ruleSet } from '../rater/rule-set';
import { alertP1 } from './alert';
import { deleteToken, encryptBytes } from './crypto';
import { newFileKey, type CaseFileStore } from './files';
import { nextWeekStart, weekKey } from './week';

/**
 * Opening a case from a red result (spec, "Escalations"). The fields are
 * rated again here: the priority comes from the server's own rating, never
 * from the browser. Capacity is 20 cases a week, Monday to Sunday, in
 * Ulaanbaatar time; P1 is always accepted, P2 is accepted and flagged as over
 * capacity, and a P3 over the cap gets the self-help kit and can ask again
 * next week.
 */

export const intakeSchema = z.object({
  contactMethod: z.enum(['phone', 'facebook']),
  contact: z.string().trim().min(3).max(200),
  bestTime: z.enum(['morning', 'day', 'evening']).nullable(),
  description: z.string().trim().max(1000).nullable(),
  consentToContact: z.literal(true),
  /** "Save so Ajilchin Zugii can help me" — unticked by default. */
  storeFile: z.boolean(),
  guardianConsent: z.boolean(),
  /** Where to send the delete link. Used once, never stored. */
  deleteEmail: z.string().trim().email().max(200).nullable(),
  /** The redacted document text, only when the reader opted in to storing it. */
  text: z.string().max(80_000).nullable(),
});

export type Intake = z.infer<typeof intakeSchema>;

export type CaseResult =
  | { accepted: true; caseId: string; priority: 'P1' | 'P2' | 'P3'; deadline: string; overCapacity: boolean; fileStored: boolean; deleteToken: string }
  | { accepted: false; reason: 'not_red' }
  | { accepted: false; reason: 'over_capacity'; selfHelp: true; askAgainFrom: string };

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const randomCode = (length: number) => Array.from(crypto.getRandomValues(new Uint8Array(length)), (b) => ALPHABET[b % ALPHABET.length]).join('');

export async function openCase(
  payload: Payload,
  request: RatingRequest,
  intake: Intake,
  options: { store: CaseFileStore | null; memberClerkId: string | null; now?: Date; alert?: typeof alertP1 },
): Promise<CaseResult> {
  const now = options.now ?? new Date();
  const rating = rateRequest(request);
  if (rating.verdict !== 'red' || !rating.priority) return { accepted: false, reason: 'not_red' };
  const priority = rating.priority;

  const week = weekKey(now);
  const { totalDocs } = await payload.count({ collection: 'cases', where: { weekKey: { equals: week } }, overrideAccess: true });
  const overCapacity = totalDocs >= ruleSet.escalation.weekly_capacity;
  if (overCapacity && priority === 'P3') return { accepted: false, reason: 'over_capacity', selfHelp: true, askAgainFrom: nextWeekStart(now) };

  const caseId = `AZ-${week.replace('-W', '')}-${randomCode(4)}`;
  const deadline = new Date(now.getTime() + ruleSet.escalation.response_hours[priority] * 3_600_000).toISOString();
  const fields = request.actual ?? request.fields;

  // A minor's file (or one whose age is unknown) is stored only with a
  // guardian's consent (CLAUDE.md rule 4); without it the case still opens.
  const adult = rating.ageBand === '18_24' || rating.ageBand === '25_plus';
  let fileKey: string | null = null;
  if (intake.storeFile && options.store && (adult || intake.guardianConsent)) {
    // Redacted again here whatever the browser sent: the register number is
    // never stored (spec, "Opt-in storage").
    const bundle = {
      text: intake.text ? redact(intake.text).text : null,
      fields: { ...fields, evidence: Object.fromEntries(Object.entries(fields.evidence).map(([k, v]) => [k, { ...v, excerpt: redact(v.excerpt).text }])) },
      results: rating.results.map((r) => ({ id: r.id, verdict: r.verdict, status: r.status })),
      ruleSetVersion: rating.ruleSetVersion,
      ratedOn: rating.ratedOn,
    };
    fileKey = newFileKey();
    await options.store.put(fileKey, await encryptBytes(new TextEncoder().encode(JSON.stringify(bundle))));
  }

  await payload.create({
    collection: 'cases',
    overrideAccess: true,
    data: {
      caseId,
      priority,
      deadline,
      overCapacity,
      weekKey: week,
      status: 'new',
      failedRules: rating.results.filter((r) => r.verdict === 'red').map((r) => r.id),
      ageBand: rating.ageBand,
      jobCategory: fields.job_category ?? 'unknown',
      contactMethod: intake.contactMethod,
      contact: intake.contact,
      bestTime: intake.bestTime,
      description: intake.description,
      consentToContact: true,
      storeFile: Boolean(fileKey),
      guardianConsent: intake.guardianConsent,
      guardianConsentAt: intake.guardianConsent ? now.toISOString() : null,
      fileKey,
      fileDeleteAt: fileKey ? new Date(now.getTime() + 90 * 86_400_000).toISOString() : null,
      memberClerkId: options.memberClerkId,
    },
  });

  if (priority === 'P1') await (options.alert ?? alertP1)(payload, { caseId, deadline });

  return { accepted: true, caseId, priority, deadline, overCapacity, fileStored: Boolean(fileKey), deleteToken: await deleteToken(caseId) };
}

/** Deletes a case and its stored file. Safe to run twice. */
export async function deleteCase(payload: Payload, caseId: string, store: CaseFileStore | null): Promise<boolean> {
  const { docs } = await payload.find({ collection: 'cases', where: { caseId: { equals: caseId } }, limit: 1, depth: 0, overrideAccess: true });
  const doc = docs[0];
  if (!doc) return false;
  if (doc.fileKey) await store?.delete(doc.fileKey);
  await payload.delete({ collection: 'cases', id: doc.id, overrideAccess: true });
  return true;
}

/** The daily purge: files past 90 days, and files of closed cases. */
export async function purgeCaseFiles(payload: Payload, store: CaseFileStore | null, now = new Date()): Promise<number> {
  const { docs } = await payload.find({
    collection: 'cases',
    where: { and: [{ fileKey: { exists: true } }, { or: [{ fileDeleteAt: { less_than_equal: now.toISOString() } }, { status: { equals: 'closed' } }] }] },
    limit: 500,
    depth: 0,
    overrideAccess: true,
  });
  let purged = 0;
  for (const doc of docs) {
    if (!doc.fileKey) continue;
    await store?.delete(doc.fileKey);
    await payload.update({ collection: 'cases', id: doc.id, data: { fileKey: null, fileDeleteAt: null }, overrideAccess: true });
    purged += 1;
  }
  return purged;
}

import { caseFileStore } from '../cases/files';
import { deleteCase } from '../cases/intake';
import { payload } from './members';

/**
 * Deletes every row of ours that belongs to a Clerk user: their saved
 * ratings, then the member row. Case records linked to the account are
 * deleted with their stored files (src/lib/cases/delete.ts). Used by "delete
 * my account and data" and by the user.deleted webhook, so it must be safe to
 * run twice.
 */
export async function deleteMemberData(clerkUserId: string): Promise<void> {
  const p = await payload();
  const { docs } = await p.find({ collection: 'members', where: { clerkUserId: { equals: clerkUserId } }, limit: 1, depth: 0 });
  const member = docs[0];
  const cases = await p.find({ collection: 'cases', where: { memberClerkId: { equals: clerkUserId } }, limit: 200, depth: 0, overrideAccess: true });
  for (const c of cases.docs) await deleteCase(p, c.caseId, caseFileStore());
  if (member) {
    await p.delete({ collection: 'saved-ratings', where: { member: { equals: member.id } }, overrideAccess: true });
    await p.delete({ collection: 'members', id: member.id, overrideAccess: true });
  }
}

import type { CollectionConfig } from 'payload';
import { AIMAGS } from '../../lib/aimags';
import { isAdmin, nobody } from '../access';

/**
 * People with a rater account, keyed by their Clerk user id. Holds only what
 * the account needs: an age band (never a date of birth), the guardian's
 * consent for 13–17, an optional target job and aimag, and a reusable CV
 * profile. No name, no email — those stay with Clerk.
 *
 * Written only by the server (Local API); admins can see the rows, nobody
 * edits them by hand. Deleting the account deletes the row and everything
 * linked to it (src/lib/accounts/delete.ts).
 */
export const Members: CollectionConfig = {
  slug: 'members',
  labels: { singular: 'Гишүүн / Member', plural: 'Гишүүд / Members' },
  admin: {
    useAsTitle: 'clerkUserId',
    group: 'Үнэлгээ / Raters',
    defaultColumns: ['clerkUserId', 'ageBand', 'guardianConsent', 'createdAt'],
    description: 'Бүртгэлтэй хэрэглэгчид. Нэр, и-мэйл энд хадгалагдахгүй. Account holders; names and emails stay with Clerk.',
  },
  access: { read: isAdmin, create: nobody, update: nobody, delete: isAdmin },
  fields: [
    { name: 'clerkUserId', type: 'text', required: true, unique: true, index: true, admin: { readOnly: true } },
    {
      name: 'ageBand',
      type: 'select',
      required: true,
      options: [
        { label: '13–14', value: '13_14' },
        { label: '15–17', value: '15_17' },
        { label: '18–24', value: '18_24' },
      ],
    },
    {
      name: 'guardianConsent',
      type: 'checkbox',
      defaultValue: false,
      admin: { description: '13–17: эцэг эх / асран хамгаалагч зөвшөөрсөн. A guardian ticked the consent box.' },
    },
    { name: 'guardianConsentAt', type: 'date', admin: { readOnly: true, date: { pickerAppearance: 'dayAndTime' } } },
    { name: 'targetJob', type: 'text' },
    { name: 'aimag', type: 'select', options: AIMAGS.map((id) => ({ label: id, value: id })) },
    { name: 'cvProfile', type: 'json' },
  ],
};

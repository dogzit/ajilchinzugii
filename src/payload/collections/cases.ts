import type { CollectionConfig } from 'payload';
import { decryptText, encryptText, isEncrypted } from '../../lib/cases/crypto';
import { caseFileStore } from '../../lib/cases/files';
import { isAdminOrCaseworker, isCaseworker, nobody } from '../access';

/**
 * Escalation cases (spec, "Escalations"). Opened from a red result's "Talk
 * to Ajilchin Zugii"; created only by the server. Only caseworkers can open
 * one, and every time one is opened a row is written to case-access-log.
 *
 * The contact and the description are encrypted before they reach the
 * database and decrypted only for a caseworker. An opted-in file lives in a
 * private bucket, encrypted, and is deleted after 90 days or when the case
 * closes, whichever comes first.
 */

const ENCRYPTED = ['contact', 'description'] as const;

export const Cases: CollectionConfig = {
  slug: 'cases',
  labels: { singular: 'Хэрэг / Case', plural: 'Хэргүүд / Cases' },
  admin: {
    useAsTitle: 'caseId',
    group: 'Үнэлгээ / Raters',
    defaultColumns: ['caseId', 'priority', 'deadline', 'status', 'caseworker', 'overCapacity'],
    description: 'Зөвхөн хэргийн ажилтан нээнэ; нээх бүр бүртгэгдэнэ. Caseworkers only; every view is logged.',
  },
  access: { read: isCaseworker, create: nobody, update: isCaseworker, delete: isCaseworker },
  hooks: {
    beforeChange: [
      async ({ data }) => {
        for (const field of ENCRYPTED) {
          const value = data[field];
          if (typeof value === 'string' && value && !isEncrypted(value)) data[field] = await encryptText(value);
        }
        return data;
      },
    ],
    afterRead: [
      async ({ doc, req, findMany }) => {
        const caseworker = req.user?.role === 'caseworker';
        for (const field of ENCRYPTED) {
          if (typeof doc[field] === 'string' && doc[field]) doc[field] = caseworker ? await decryptText(doc[field]) : '••••';
        }
        // Every time a caseworker opens one case, it is written down.
        if (caseworker && !findMany && req.user) {
          await req.payload.create({
            collection: 'case-access-log',
            data: { case: doc.id, user: req.user.id, action: 'view', at: new Date().toISOString() },
            overrideAccess: true,
            req,
          });
        }
        return doc;
      },
    ],
    afterChange: [
      async ({ doc, req }) => {
        // Closing a case deletes its file then and there; the daily purge
        // catches anything this misses.
        if (doc.status === 'closed' && doc.fileKey) {
          await caseFileStore()?.delete(doc.fileKey);
          await req.payload.update({ collection: 'cases', id: doc.id, data: { fileKey: null, fileDeleteAt: null }, overrideAccess: true, req });
        }
        return doc;
      },
    ],
  },
  fields: [
    { name: 'caseId', type: 'text', required: true, unique: true, index: true, admin: { readOnly: true } },
    { name: 'priority', type: 'select', required: true, options: ['P1', 'P2', 'P3'], admin: { readOnly: true } },
    { name: 'deadline', type: 'date', required: true, admin: { readOnly: true, date: { pickerAppearance: 'dayAndTime' } } },
    { name: 'overCapacity', type: 'checkbox', defaultValue: false, admin: { readOnly: true } },
    { name: 'weekKey', type: 'text', required: true, index: true, admin: { readOnly: true } },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'new',
      options: [
        { label: 'Шинэ / New', value: 'new' },
        { label: 'Холбогдсон / Contacted', value: 'contacted' },
        { label: 'Шийдвэрлэж буй / In progress', value: 'in_progress' },
        { label: 'Шилжүүлсэн / Referred', value: 'referred' },
        { label: 'Хаагдсан / Closed', value: 'closed' },
      ],
    },
    {
      name: 'outcome',
      type: 'select',
      options: [
        { label: 'Ажил олгогчтой засварласан / Fixed with employer', value: 'fixed_with_employer' },
        { label: 'Хөдөлмөрийн хяналтад шилжүүлсэн / Referred to labour inspection', value: 'referred_labour_inspection' },
        { label: 'МҮЭХ-ны хууль зүйн туслалцаанд / Referred to CMTU legal aid', value: 'referred_cmtu_legal_aid' },
        { label: 'Хариу өгөөгүй / No response', value: 'no_response' },
        { label: 'Бусад / Other', value: 'other' },
      ],
    },
    { name: 'caseworker', type: 'relationship', relationTo: 'users', filterOptions: { role: { equals: 'caseworker' } } },
    { name: 'failedRules', type: 'json', required: true, admin: { readOnly: true } },
    { name: 'ageBand', type: 'text', admin: { readOnly: true } },
    { name: 'jobCategory', type: 'text', admin: { readOnly: true } },
    { name: 'contactMethod', type: 'select', required: true, options: ['phone', 'facebook'], admin: { readOnly: true } },
    { name: 'contact', type: 'text', required: true, admin: { readOnly: true, description: 'Шифрлэгдсэн. Encrypted at rest.' } },
    { name: 'bestTime', type: 'select', options: ['morning', 'day', 'evening'], admin: { readOnly: true } },
    { name: 'description', type: 'textarea', admin: { readOnly: true, description: 'Шифрлэгдсэн. Encrypted at rest.' } },
    { name: 'consentToContact', type: 'checkbox', required: true, admin: { readOnly: true } },
    { name: 'storeFile', type: 'checkbox', defaultValue: false, admin: { readOnly: true } },
    { name: 'guardianConsent', type: 'checkbox', defaultValue: false, admin: { readOnly: true } },
    { name: 'guardianConsentAt', type: 'date', admin: { readOnly: true } },
    {
      name: 'guardianConfirmedOnCall',
      type: 'checkbox',
      defaultValue: false,
      admin: { description: '18 хүрээгүй бол анхны дуудлагаар асран хамгаалагчийн зөвшөөрлийг баталгаажуулна. For a minor, confirm the guardian consented on the first call.' },
    },
    { name: 'fileKey', type: 'text', admin: { readOnly: true } },
    { name: 'fileDeleteAt', type: 'date', admin: { readOnly: true } },
    { name: 'memberClerkId', type: 'text', index: true, admin: { readOnly: true } },
  ],
};

export const CaseAccessLog: CollectionConfig = {
  slug: 'case-access-log',
  labels: { singular: 'Хэрэг нээсэн бүртгэл / Case access', plural: 'Хэрэг нээсэн бүртгэл / Case access log' },
  timestamps: false,
  admin: { group: 'Үнэлгээ / Raters', defaultColumns: ['case', 'user', 'action', 'at'] },
  access: { read: isAdminOrCaseworker, create: nobody, update: nobody, delete: nobody },
  fields: [
    { name: 'case', type: 'relationship', relationTo: 'cases', index: true },
    { name: 'user', type: 'relationship', relationTo: 'users', required: true },
    { name: 'action', type: 'select', required: true, options: ['view'] },
    { name: 'at', type: 'date', required: true, admin: { date: { pickerAppearance: 'dayAndTime' } } },
  ],
};

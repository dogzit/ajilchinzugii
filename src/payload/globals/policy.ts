import { lexicalEditor } from '@payloadcms/richtext-lexical';
import type { GlobalConfig } from 'payload';
import { isStaff, publishedOrStaff } from '../access';
import { seoField } from '../fields/seo';
import { revalidateLocalizedPaths } from '../hooks/revalidate';

export const policyStatuses = [
  'drafted',
  'submitted',
  'under-review',
  'adopted',
  'rejected',
] as const;

const statusOptions = [
  { label: 'Боловсруулсан / Drafted', value: 'drafted' },
  { label: 'Хүргүүлсэн / Submitted', value: 'submitted' },
  { label: 'Хэлэлцэгдэж байна / Under review', value: 'under-review' },
  { label: 'Батлагдсан / Adopted', value: 'adopted' },
  { label: 'Татгалзсан / Rejected', value: 'rejected' },
];

/**
 * The policy proposal and where it stands. The history array is what makes the
 * claim checkable: every status change keeps its own date.
 */
export const Policy: GlobalConfig = {
  slug: 'policy',
  label: 'Бодлого / Policy',
  admin: { group: 'Агуулга / Content' },
  access: { read: publishedOrStaff, update: isStaff },
  versions: { drafts: true, max: 50 },
  hooks: {
    afterChange: [async () => revalidateLocalizedPaths(['/policy'])],
  },
  fields: [
    {
      name: 'summary',
      type: 'textarea',
      required: true,
      localized: true,
      label: 'Хураангуй / Summary',
    },
    {
      name: 'fullText',
      type: 'richText',
      localized: true,
      editor: lexicalEditor({}),
      label: 'Бүрэн эх / Full text',
    },
    {
      name: 'proposals',
      type: 'array',
      label: 'Саналууд / The proposed changes',
      admin: {
        description:
          'Өөрчлөлт бүр аль цоорхойг нөхөж байгаа, ямар нотолгоонд тулгуурласныг хамт бичнэ — иймээс л уншигч санал бүрийг шалгаж чадна. Each change says which gap it closes and what evidence stands behind it, which is what lets a reader check it.',
      },
      labels: { singular: 'Санал / Change', plural: 'Саналууд / Changes' },
      fields: [
        {
          name: 'change',
          type: 'textarea',
          required: true,
          localized: true,
          label: 'Өөрчлөлт / The change',
        },
        {
          name: 'gap',
          type: 'textarea',
          required: true,
          localized: true,
          label: 'Нөхөж буй цоорхой / The gap it closes',
        },
        {
          name: 'evidence',
          type: 'textarea',
          required: true,
          localized: true,
          label: 'Нотолгоо / The evidence behind it',
        },
      ],
    },
    {
      name: 'basedOn',
      type: 'relationship',
      relationTo: 'papers',
      label: 'Аль судалгаанд тулгуурласан / The paper this rests on',
      admin: {
        description:
          'Сонгосон бол бодлогын хуудас тухайн судалгаа руу холбогдоно. Нотолгоогүй санал бол санал биш. When set, the policy page links to that paper. A proposal with no evidence behind it is not a proposal.',
      },
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'drafted',
      options: statusOptions,
      // Keeps this enum apart from the draft/published `_status` enum that
      // Postgres creates for the versions feature.
      enumName: 'enum_policy_proposal_status',
      label: 'Төлөв / Status',
      admin: { position: 'sidebar' },
    },
    {
      name: 'statusDate',
      type: 'date',
      required: true,
      label: 'Төлвийн огноо / Date of this status',
      admin: {
        position: 'sidebar',
        date: { pickerAppearance: 'dayOnly', displayFormat: 'yyyy-MM-dd' },
      },
    },
    {
      name: 'history',
      type: 'array',
      label: 'Явцын бүртгэл / History',
      admin: {
        description:
          'Төлөв өөрчлөгдөх болгонд шинэ мөр нэм — хуучныг дарж бичихгүй. Add a row for every status change — do not overwrite the previous one.',
      },
      fields: [
        {
          name: 'date',
          type: 'date',
          required: true,
          label: 'Огноо / Date',
          admin: { date: { pickerAppearance: 'dayOnly', displayFormat: 'yyyy-MM-dd' } },
        },
        {
          name: 'status',
          type: 'select',
          required: true,
          options: statusOptions,
          label: 'Төлөв / Status',
        },
        {
          name: 'note',
          type: 'textarea',
          localized: true,
          label: 'Тэмдэглэл / Note',
        },
      ],
    },
    seoField(),
  ],
};

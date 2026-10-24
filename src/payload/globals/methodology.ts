import { lexicalEditor } from '@payloadcms/richtext-lexical';
import type { GlobalConfig } from 'payload';
import { isAnchorId, isHttpUrl } from '../../lib/validators';
import { isStaff, publishedOrStaff } from '../access';
import { seoField } from '../fields/seo';
import { revalidateLocalizedPaths } from '../hooks/revalidate';

const anchorIdField = {
  name: 'anchorId',
  type: 'text' as const,
  required: true,
  label: 'Anchor id (хөдөлдөггүй) / Anchor id (stable)',
  admin: {
    description:
      'Нийтлэгдсэн хаягийн хэсэг: /methodology#<anchorId>. Тоонууд үүнд холбогдоно — хэзээ ч солихгүй. Part of a published URL: /methodology#<anchorId>. Figures link to it — never change it.',
  },
  validate: (value: unknown) =>
    typeof value === 'string' && isAnchorId(value)
      ? true
      : 'Зөвхөн жижиг латин үсэг, тоо, зураас / lowercase latin letters, numbers and hyphens only.',
};

/**
 * How every published figure is produced. Each definition and counting rule
 * carries a stable anchor so a number on the impact page can link straight to
 * the rule it was produced by.
 */
export const Methodology: GlobalConfig = {
  slug: 'methodology',
  label: 'Аргачлал / Methodology',
  admin: { group: 'Агуулга / Content' },
  access: { read: publishedOrStaff, update: isStaff },
  versions: { drafts: true, max: 50 },
  hooks: {
    afterChange: [async () => revalidateLocalizedPaths(['/methodology', '/impact'])],
  },
  fields: [
    {
      name: 'sources',
      type: 'array',
      label: 'Эх сурвалжууд / Sources',
      fields: [
        {
          name: 'title',
          type: 'text',
          required: true,
          localized: true,
          label: 'Гарчиг / Title',
        },
        {
          name: 'url',
          type: 'text',
          label: 'Хаяг / URL',
          validate: (value: unknown) =>
            !value || (typeof value === 'string' && isHttpUrl(value))
              ? true
              : 'https:// -ээр эхлэх бүтэн хаяг / a full http(s) URL is required.',
        },
        {
          name: 'note',
          type: 'textarea',
          localized: true,
          label: 'Тэмдэглэл / Note',
        },
      ],
    },
    {
      name: 'definitions',
      type: 'array',
      label: 'Тодорхойлолтууд / Definitions',
      fields: [
        anchorIdField,
        {
          name: 'term',
          type: 'text',
          required: true,
          localized: true,
          label: 'Нэр томьёо / Term',
        },
        {
          name: 'definition',
          type: 'textarea',
          required: true,
          localized: true,
          label: 'Тодорхойлолт / Definition',
        },
      ],
    },
    {
      name: 'countingRules',
      type: 'array',
      label: 'Тоолох журам / Counting rules',
      fields: [
        anchorIdField,
        {
          name: 'rule',
          type: 'text',
          required: true,
          localized: true,
          label: 'Журам / Rule',
        },
        {
          name: 'detail',
          type: 'textarea',
          required: true,
          localized: true,
          label: 'Тайлбар / Detail',
        },
      ],
    },
    {
      name: 'limitations',
      type: 'richText',
      localized: true,
      editor: lexicalEditor({}),
      label: 'Хязгаарлалт / Limitations',
      admin: {
        description:
          'Эдгээр тоо юуг харуулж чадахгүйг шулуухан бич. What these numbers cannot show. Write it plainly.',
      },
    },
    {
      name: 'changeLog',
      type: 'array',
      label: 'Өөрчлөлтийн бүртгэл / Change log',
      admin: {
        description:
          'Тодорхойлолт, журмын өөрчлөлт бүрийг огноотой нь энд бүртгэнэ. Every change to a definition or a rule is recorded here, with a date.',
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
          name: 'summary',
          type: 'textarea',
          required: true,
          localized: true,
          label: 'Юу өөрчлөгдсөн / What changed',
        },
      ],
    },
    seoField(),
  ],
};

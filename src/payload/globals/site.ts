import type { GlobalConfig } from 'payload';
import { isHttpUrl } from '../../lib/validators';
import { anyone, isStaff } from '../access';
import { seoField } from '../fields/seo';
import { revalidateLocalizedPaths } from '../hooks/revalidate';

/**
 * Site-wide text and the fields that feed the Organization JSON-LD.
 * The domain is never stored here — it comes from NEXT_PUBLIC_SITE_URL
 * (CLAUDE.md rule 9).
 */
export const Site: GlobalConfig = {
  slug: 'site',
  label: 'Сайтын тохиргоо / Site',
  admin: { group: 'Тохиргоо / Settings' },
  access: { read: anyone, update: isStaff },
  hooks: {
    // The header and footer sit in the layout, so every route is affected.
    afterChange: [async () => revalidateLocalizedPaths(['/'], 'layout')],
  },
  fields: [
    {
      name: 'missionLine',
      type: 'textarea',
      localized: true,
      required: true,
      label: 'Эрхэм зорилгын мөр / Mission line',
      admin: {
        description:
          'Нэг өгүүлбэр. Нүүр хуудсан дээр харагдана. One sentence. Shown on the home page.',
      },
    },
    {
      name: 'contactEmail',
      type: 'email',
      required: true,
      label: 'Холбоо барих и-мэйл / Contact email',
      admin: {
        description:
          'Сонгож болох текст хэлбэрээр харагдана. Холбоо барих форм хэзээ ч нэмэхгүй. Shown as selectable text. No contact form is ever added.',
      },
    },
    {
      name: 'socialLinks',
      type: 'array',
      label: 'Сошиал хаягууд / Social links',
      fields: [
        {
          name: 'platform',
          type: 'text',
          required: true,
          label: 'Платформ / Platform',
        },
        {
          name: 'url',
          type: 'text',
          required: true,
          label: 'Хаяг / URL',
          validate: (value: unknown) =>
            typeof value === 'string' && isHttpUrl(value)
              ? true
              : 'https:// -ээр эхлэх бүтэн хаяг / a full http(s) URL is required.',
        },
      ],
    },
    {
      name: 'organization',
      type: 'group',
      label: 'Байгууллага (structured data) / Organization (structured data)',
      admin: {
        description:
          'Хайлтын системийн Organization schema-д хэрэглэгдэнэ. Used for the Organization schema search engines read.',
      },
      fields: [
        {
          name: 'legalName',
          type: 'text',
          required: true,
          localized: true,
          label: 'Хуулийн нэр / Legal name',
        },
        {
          name: 'foundingDate',
          type: 'date',
          label: 'Байгуулагдсан өдөр / Founding date',
          admin: { date: { pickerAppearance: 'dayOnly', displayFormat: 'yyyy-MM-dd' } },
        },
        {
          name: 'addressCity',
          type: 'text',
          localized: true,
          label: 'Хот / City',
        },
      ],
    },
    seoField(),
  ],
};

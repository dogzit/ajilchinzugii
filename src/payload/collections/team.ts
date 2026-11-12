import { lexicalEditor } from '@payloadcms/richtext-lexical';
import type { CollectionConfig } from 'payload';
import { isHttpUrl, isSlug, slugify } from '../../lib/validators';
import { confirmedAdultsOrStaff, isStaff } from '../access';
import { seoField } from '../fields/seo';
import { revalidateLocalizedPaths } from '../hooks/revalidate';

/**
 * People listed publicly. Only adults are ever listed individually: minors are
 * represented by the organisation, never by name or photograph (CLAUDE.md
 * rule 4). The confirmation checkbox has to be ticked before a row can save,
 * and the public read filter requires it as well.
 */
export const Team: CollectionConfig = {
  slug: 'team',
  labels: {
    singular: 'Хамт олны гишүүн / Team member',
    plural: 'Хамт олон / Team',
  },
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'role', 'confirmedAdult18Plus'],
    group: 'Агуулга / Content',
    description:
      'Зөвхөн насанд хүрсэн хүн. 18 хүрээгүй хүнийг энд оруулж болохгүй. Adults only. Never add a person under 18 here.',
  },
  access: {
    read: confirmedAdultsOrStaff,
    create: isStaff,
    update: isStaff,
    delete: isStaff,
  },
  hooks: {
    beforeValidate: [
      ({ data }) => {
        if (!data) return data;
        // Not localized: /team/<slug> has to be the same path in both
        // languages, or the language switch cannot keep the reader on the
        // person they were reading about.
        if (!data.slug && typeof data.name === 'string') {
          data.slug = slugify(data.name);
        }
        return data;
      },
    ],
    // The member's own page as well as the list they appear on.
    afterChange: [
      async ({ doc }) =>
        revalidateLocalizedPaths(['/about', `/team/${doc.slug}`].filter(Boolean)),
    ],
    afterDelete: [
      async ({ doc }) =>
        revalidateLocalizedPaths(['/about', `/team/${doc.slug}`].filter(Boolean)),
    ],
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
      // Localized: a Mongolian name is written in Cyrillic for Mongolian
      // readers and in latin for English ones, surname first in both. The
      // slug below stays one value, so a person's address does not change
      // with the language the reader happens to be in.
      localized: true,
      label: 'Нэр / Name',
    },
    {
      name: 'slug',
      type: 'text',
      required: true,
      unique: true,
      index: true,
      label: 'Slug (URL)',
      admin: {
        position: 'sidebar',
        description:
          'Хаягийн хэсэг: /team/<slug>. Нийтэлсний дараа солихгүй — линк эвдэрнэ. Кирилл нэрийг латинаар бичнэ. Part of the address: /team/<slug>. Do not change it after publishing — links break. Write a Cyrillic name out in latin letters.',
      },
      validate: (value: unknown) =>
        typeof value === 'string' && isSlug(value)
          ? true
          : 'Зөвхөн жижиг латин үсэг, тоо, зураас / lowercase latin letters, numbers and hyphens only.',
    },
    {
      name: 'role',
      type: 'text',
      required: true,
      localized: true,
      label: 'Хариуцах ажил / Role',
    },
    {
      name: 'bio',
      type: 'richText',
      localized: true,
      editor: lexicalEditor({}),
      label: 'Товч танилцуулга / Short biography',
    },
    {
      name: 'photo',
      type: 'upload',
      relationTo: 'media',
      label: 'Зураг / Photo',
      filterOptions: { mimeType: { contains: 'image' } },
    },
    {
      name: 'profiles',
      type: 'array',
      label: 'Мэргэжлийн хуудас / Professional profiles',
      labels: {
        singular: 'Хуудас / Profile',
        plural: 'Мэргэжлийн хуудас / Professional profiles',
      },
      admin: {
        description:
          'Уншигч тухайн хүний ажлыг шалгах боломжтой хаяг: ResearchGate, ORCID, хувийн вэб. Зөвхөн ажлынх, хувийн сошиал хаяг биш. A page where a reader can check this person’s work: ResearchGate, ORCID, a portfolio. Professional pages only, not personal social accounts.',
      },
      fields: [
        {
          name: 'label',
          type: 'text',
          required: true,
          localized: true,
          label: 'Нэр / Label',
          admin: {
            description:
              'Холбоос дээр харагдах үг: «ResearchGate», «Портфолио». The words the link is shown as: “ResearchGate”, “Portfolio”.',
          },
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
      name: 'confirmedAdult18Plus',
      type: 'checkbox',
      required: true,
      defaultValue: false,
      label:
        'Энэ хүн 18 нас хүрсэн гэдгийг баталж байна / I confirm this person is 18 or older',
      admin: {
        position: 'sidebar',
        description:
          'Шаардлагатай. Үүнгүйгээр хадгалагдахгүй, нийтэд харагдахгүй. Required. Without it the person is not saved and not listed.',
      },
      validate: (value: unknown) =>
        value === true
          ? true
          : 'Зөвхөн насанд хүрсэн хүнийг нийтэд харуулна / only adults may be listed publicly.',
    },
    seoField(),
  ],
};

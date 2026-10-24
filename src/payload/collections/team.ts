import { lexicalEditor } from '@payloadcms/richtext-lexical';
import type { CollectionConfig } from 'payload';
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
    afterChange: [async () => revalidateLocalizedPaths(['/about'])],
    afterDelete: [async () => revalidateLocalizedPaths(['/about'])],
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
      label: 'Нэр / Name',
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

import { lexicalEditor } from '@payloadcms/richtext-lexical';
import type { CollectionConfig } from 'payload';
import { isHttpUrl } from '../../lib/validators';
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

import type { CollectionConfig } from 'payload';
import { isHttpUrl } from '../../lib/validators';
import { anyone, isStaff } from '../access';
import { seoField } from '../fields/seo';
import { revalidateLocalizedPaths } from '../hooks/revalidate';

export const Partners: CollectionConfig = {
  slug: 'partners',
  labels: {
    singular: 'Хамтрагч / Partner',
    plural: 'Хамтрагчид / Partners',
  },
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'url', 'updatedAt'],
    group: 'Агуулга / Content',
  },
  access: {
    read: anyone,
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
      name: 'logo',
      type: 'upload',
      relationTo: 'media',
      label: 'Лого / Logo',
      filterOptions: { mimeType: { contains: 'image' } },
    },
    {
      name: 'url',
      type: 'text',
      label: 'Вэб хаяг / Website',
      validate: (value: unknown) =>
        !value || (typeof value === 'string' && isHttpUrl(value))
          ? true
          : 'https:// -ээр эхлэх бүтэн хаяг / a full http(s) URL is required.',
    },
    seoField(),
  ],
};

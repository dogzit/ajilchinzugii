import type { GlobalConfig } from 'payload';
import { anyone, isStaff, nobody } from '../access';
import { seoField } from '../fields/seo';
import { revalidateLocalizedPaths } from '../hooks/revalidate';

/**
 * The last good result of the Google Sheet fetch (phase 3). It is written only
 * by the server through the Local API, which bypasses access control, so the
 * admin UI shows it read-only: a figure must never be editable by hand
 * (CLAUDE.md rule 1).
 */
export const ImpactSnapshot: GlobalConfig = {
  slug: 'impact-snapshot',
  label: 'Нөлөөллийн тоо (зөвхөн харах) / Impact snapshot (read-only)',
  admin: {
    group: 'Өгөгдөл / Data',
    description:
      'Өгөгдлийн сувгаар автоматаар бичигдэнэ. Тоог гараар оруулдаггүй. Written by the data pipeline. Figures are never typed in by hand.',
  },
  access: { read: anyone, update: nobody, readVersions: isStaff },
  hooks: {
    afterChange: [async () => revalidateLocalizedPaths(['/', '/impact'])],
  },
  fields: [
    {
      name: 'data',
      type: 'json',
      label: 'Шалгагдсан өгөгдөл / Validated snapshot',
      admin: { readOnly: true },
    },
    {
      name: 'fetchedAt',
      type: 'date',
      label: 'Татсан хугацаа / Fetched at',
      admin: { readOnly: true, date: { pickerAppearance: 'dayAndTime' } },
    },
    seoField(),
  ],
};

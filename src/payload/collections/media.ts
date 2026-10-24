import type { CollectionConfig } from 'payload';
import { consentErrorMessage, mediaSubjects, missingConsent } from '../../lib/consent';
import { anonymiseFileName } from '../../lib/filenames';
import { anyone, isStaff } from '../access';
import { seoField } from '../fields/seo';

const teenOnly = {
  condition: (_: unknown, siblingData: { subject?: string }) =>
    siblingData?.subject === 'teen-member',
};

/**
 * Images and PDFs. File bytes live in Cloudflare R2, never in Postgres.
 *
 * Three rules from CLAUDE.md are enforced here:
 *  - alt text is required in Mongolian *and* English (rule 7). Payload's
 *    localized `required` only validates the locale being saved and would let
 *    a missing English alt fall back to Mongolian silently, so the two
 *    languages are explicit fields instead;
 *  - a photo of a teen member needs a recorded written consent (rule 4);
 *  - the stored file name is random and all image metadata is dropped, so a
 *    name, a school or GPS coordinates cannot leak through a file (rule 4).
 */
export const Media: CollectionConfig = {
  slug: 'media',
  labels: {
    singular: 'Зураг, файл / Media',
    plural: 'Зураг, файл / Media',
  },
  admin: {
    useAsTitle: 'filename',
    defaultColumns: ['filename', 'subject', 'updatedAt'],
    group: 'Агуулга / Content',
    description:
      'Бичгээр баталгаажсан зөвшөөрөлгүйгээр хүүхдийн зураг оруулахыг хориглоно. No photographs of minors without a recorded written consent.',
  },
  access: {
    read: anyone,
    create: isStaff,
    update: isStaff,
    delete: isStaff,
  },
  upload: {
    mimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'application/pdf'],
    // Never copy EXIF/GPS/IPTC into any derivative, and re-encode the original
    // through sharp so the stored "original" carries no metadata either.
    withMetadata: false,
    formatOptions: { format: 'webp', options: { quality: 82 } },
    focalPoint: false,
    crop: false,
    adminThumbnail: 'webp480',
    imageSizes: [
      {
        name: 'webp480',
        width: 480,
        withoutEnlargement: true,
        formatOptions: { format: 'webp', options: { quality: 78 } },
      },
      {
        name: 'webp960',
        width: 960,
        withoutEnlargement: true,
        formatOptions: { format: 'webp', options: { quality: 78 } },
      },
      {
        name: 'webp1600',
        width: 1600,
        withoutEnlargement: true,
        formatOptions: { format: 'webp', options: { quality: 76 } },
      },
      {
        name: 'avif480',
        width: 480,
        withoutEnlargement: true,
        formatOptions: { format: 'avif', options: { quality: 50 } },
      },
      {
        name: 'avif960',
        width: 960,
        withoutEnlargement: true,
        formatOptions: { format: 'avif', options: { quality: 48 } },
      },
      {
        name: 'avif1600',
        width: 1600,
        withoutEnlargement: true,
        formatOptions: { format: 'avif', options: { quality: 45 } },
      },
    ],
  },
  hooks: {
    beforeOperation: [
      ({ operation, req }) => {
        if ((operation === 'create' || operation === 'update') && req.file) {
          req.file.name = anonymiseFileName(req.file.name);
        }
      },
    ],
    beforeChange: [
      ({ data }) => {
        // Authoritative consent gate: runs for the admin UI, the REST/GraphQL
        // API and the Local API alike.
        const missing = missingConsent(data);
        if (missing.length > 0) {
          throw new Error(consentErrorMessage(missing));
        }
        return data;
      },
    ],
  },
  fields: [
    {
      name: 'alt',
      type: 'group',
      label: 'Alt текст / Alt text',
      admin: {
        description:
          'Зургийг харж чадахгүй хүнд тайлбарла. Хоёр хэл дээр хоёуланд шаардлагатай. Describe the image for someone who cannot see it. Required in both languages.',
      },
      fields: [
        {
          name: 'mn',
          type: 'text',
          required: true,
          label: 'Alt текст (монгол) / Alt text (Mongolian)',
        },
        {
          name: 'en',
          type: 'text',
          required: true,
          label: 'Alt текст (англи) / Alt text (English)',
        },
      ],
    },
    {
      name: 'subject',
      type: 'select',
      required: true,
      defaultValue: 'none',
      label: 'Файлд хэн байна / Who is in this file',
      options: [
        { label: 'Хүн байхгүй / No person', value: mediaSubjects[0] },
        { label: 'Насанд хүрсэн гишүүн / Adult member', value: mediaSubjects[1] },
        { label: 'Хүүхэд, залуу гишүүн / Teen member', value: mediaSubjects[2] },
      ],
      admin: {
        description:
          'Хүүхэд, залуу гишүүний зургийг зөвхөн бичгээр баталгаажсан зөвшөөрөлтэйгөөр хадгална. A photo of a teen member can only be saved with a recorded written consent.',
      },
      validate: (value: unknown, { siblingData }: { siblingData: unknown }) => {
        const missing = missingConsent({
          ...(siblingData as object),
          subject: value as never,
        });
        return missing.length === 0 ? true : consentErrorMessage(missing);
      },
    },
    {
      name: 'consentTeen',
      type: 'checkbox',
      label: 'Хүүхдийн бичгээр зөвшөөрөл байна / Written consent of the teen is on file',
      admin: teenOnly,
    },
    {
      name: 'consentParent',
      type: 'checkbox',
      label:
        'Эцэг эх, хуулийн ээлжит хүний бичгээр зөвшөөрөл байна / Written consent of a parent or guardian is on file',
      admin: teenOnly,
    },
    {
      name: 'consentDate',
      type: 'date',
      label: 'Зөвшөөрлийн огноо / Date of consent',
      admin: {
        ...teenOnly,
        date: { pickerAppearance: 'dayOnly', displayFormat: 'yyyy-MM-dd' },
      },
    },
    {
      name: 'consentRecordRef',
      type: 'text',
      label:
        'Бичгийн баримтын дугаар, хаана хадгалагдаж байгаа / Reference of the written record',
      admin: {
        ...teenOnly,
        description:
          'Гарын үсэгтэй баримт хаана байгаа. Хүүхдийн нэрийг энд бичиж болохгүй. Where the signed paper is kept. Never type the name of a minor here.',
      },
    },
    seoField(),
  ],
};

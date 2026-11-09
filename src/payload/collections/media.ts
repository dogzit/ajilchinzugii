import type { CollectionConfig } from 'payload';
import { consentErrorMessage, mediaSubjects, missingConsent } from '../../lib/consent';
import {
  stripImageMetadata,
  strippableImageTypes,
  UnstrippableImageError,
} from '../../lib/exif';
import { anonymiseFileName } from '../../lib/filenames';
import { stripPdfMetadata } from '../../lib/pdf';
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
    // AVIF has to stay in this list even though an AVIF *upload* is refused.
    // The list validates the generated sizes too, and the avif derivatives
    // below carry `image/avif`; dropping it made every existing media record
    // fail validation, so an editor could no longer change so much as an alt
    // text in /admin.
    //
    // The refusal lives in the beforeOperation hook instead, which is the
    // authoritative gate and fails closed: metadata cannot be removed from
    // AVIF without a full ISOBMFF rewrite, and without `sharp` on Workers
    // there is nothing to re-encode it away, so an AVIF original would reach
    // the public bucket carrying whatever the camera wrote (rule 4).
    mimeTypes: [
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/avif',
      'application/pdf',
    ],
    // Keeps sharp from copying metadata into any derivative it generates.
    // The original is cleaned in the hook below, which does not depend on
    // sharp being present at all.
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
      async ({ operation, req }) => {
        if ((operation === 'create' || operation === 'update') && req.file) {
          req.file.name = anonymiseFileName(req.file.name);

          // Every stored file is cleaned here, before it reaches the bucket.
          //
          // This used to rely on sharp re-encoding each image, which dropped
          // the metadata as a side effect. sharp is a native binary and
          // cannot run on Cloudflare Workers, so on that runtime the original
          // would have been stored exactly as uploaded — GPS coordinates and
          // all. Doing it explicitly means the guarantee holds wherever the
          // site runs, and holds for the original rather than only for the
          // derivatives (rule 4).
          const type = req.file.mimetype;

          if (type === 'application/pdf') {
            // A PDF keeps an Info dictionary and an XMP packet: a report
            // exported from Word travels with the author's name in it.
            req.file.data = await stripPdfMetadata(req.file.data);
            req.file.size = req.file.data.length;
          } else if ((strippableImageTypes as readonly string[]).includes(type)) {
            req.file.data = Buffer.from(stripImageMetadata(req.file.data, type));
            req.file.size = req.file.data.length;
          } else {
            // The upload list above should already have turned this away.
            // Refusing here too means the bucket's guarantee rests on this
            // hook alone: nothing is stored that was not cleaned first.
            throw new UnstrippableImageError(type);
          }
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

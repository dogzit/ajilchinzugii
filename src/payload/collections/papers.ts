import {
  lexicalEditor,
  BoldFeature,
  ItalicFeature,
  LinkFeature,
  ParagraphFeature,
  HeadingFeature,
  UnorderedListFeature,
  OrderedListFeature,
  BlockquoteFeature,
} from '@payloadcms/richtext-lexical';
import type { CollectionConfig } from 'payload';
import { buildApa, buildBibtex, type CitationInput } from '../../lib/citations';
import { isDoi, isHttpUrl, isSlug, slugify } from '../../lib/validators';
import { isStaff, publishedOrStaff } from '../access';
import { seoField } from '../fields/seo';
import { revalidateLocalizedPaths } from '../hooks/revalidate';

const abstractEditor = lexicalEditor({
  features: [
    ParagraphFeature(),
    HeadingFeature({ enabledHeadingSizes: ['h3', 'h4'] }),
    BoldFeature(),
    ItalicFeature(),
    LinkFeature(),
    UnorderedListFeature(),
    OrderedListFeature(),
    BlockquoteFeature(),
  ],
});

/** Research output. Drafts and versions are on, so nothing goes public by accident. */
export const Papers: CollectionConfig = {
  slug: 'papers',
  labels: {
    singular: 'Судалгаа / Paper',
    plural: 'Судалгаанууд / Papers',
  },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'year', 'status', '_status', 'updatedAt'],
    group: 'Агуулга / Content',
  },
  access: {
    read: publishedOrStaff,
    create: isStaff,
    update: isStaff,
    delete: isStaff,
  },
  versions: {
    drafts: true,
    maxPerDoc: 50,
  },
  hooks: {
    beforeValidate: [
      ({ data }) => {
        if (!data) return data;
        // The slug is not localized: /research/<slug> must be the same path in
        // both languages so the language switch can keep the reader in place.
        if (!data.slug && typeof data.title === 'string') {
          data.slug = slugify(data.title);
        }
        return data;
      },
    ],
    beforeChange: [
      ({ data }) => {
        const input: CitationInput = {
          title: data.title,
          authors: data.authors,
          year: data.year,
          venue: data.venue,
          doi: data.doi,
          slug: data.slug,
          status: data.status,
        };
        // Citations are derived, never typed by hand: one source of truth.
        data.citations = { apa: buildApa(input), bibtex: buildBibtex(input) };
        return data;
      },
    ],
    afterChange: [
      async ({ doc, previousDoc }) => {
        const slugs = new Set(
          [doc?.slug, previousDoc?.slug].filter((slug): slug is string => Boolean(slug)),
        );
        await revalidateLocalizedPaths([
          '/research',
          ...[...slugs].map((slug) => `/research/${slug}`),
        ]);
      },
    ],
    afterDelete: [
      async ({ doc }) => {
        await revalidateLocalizedPaths([
          '/research',
          ...(doc?.slug ? [`/research/${doc.slug}`] : []),
        ]);
      },
    ],
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
      localized: true,
      label: 'Гарчиг / Title',
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
          'Хаягийн хэсэг: /research/<slug>. Нийтэлсний дараа солихгүй — линк эвдэрнэ. Part of the address: /research/<slug>. Do not change it after publishing — links break.',
      },
      validate: (value: unknown) =>
        typeof value === 'string' && isSlug(value)
          ? true
          : 'Зөвхөн жижиг латин үсэг, тоо, зураас / lowercase latin letters, numbers and hyphens only.',
    },
    {
      name: 'abstract',
      type: 'richText',
      localized: true,
      editor: abstractEditor,
      label: 'Хураангуй / Abstract',
    },
    {
      name: 'authors',
      type: 'array',
      minRows: 1,
      label: 'Зохиогчид / Authors',
      labels: {
        singular: 'Зохиогч / Author',
        plural: 'Зохиогчид / Authors',
      },
      admin: {
        description:
          'Нэр бүрийг эшлэлд байх ёстой хэлбэрээр бич. Дараалал, товчлолыг автоматаар сольдоггүй. Write each name exactly as it should appear in a citation. It is never reordered or abbreviated.',
      },
      fields: [
        {
          name: 'name',
          type: 'text',
          required: true,
          label: 'Эшлэлд байх нэр / Name as cited',
        },
      ],
    },
    {
      name: 'year',
      type: 'number',
      required: true,
      min: 1990,
      max: 2100,
      label: 'Он / Year',
      admin: { position: 'sidebar' },
    },
    {
      name: 'venue',
      type: 'text',
      label: 'Хэвлэл (журнал, хурал, нийтлэгч) / Venue (journal, conference, publisher)',
    },
    {
      name: 'doi',
      type: 'text',
      label: 'DOI',
      validate: (value: unknown) =>
        !value || (typeof value === 'string' && isDoi(value))
          ? true
          : 'DOI жишээ / example: 10.1234/abcd.2026',
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'working-paper',
      // Drafts give Postgres an `enum_papers_status` of its own for `_status`,
      // which would otherwise collide with this field's enum.
      enumName: 'enum_papers_publication_status',
      label: 'Нийтлэлийн төлөв / Publication status',
      admin: { position: 'sidebar' },
      options: [
        { label: 'Ажлын хувилбар / Working paper', value: 'working-paper' },
        { label: 'Preprint', value: 'preprint' },
        { label: 'Хянагдаж байна / Under review', value: 'under-review' },
        { label: 'Нийтлэгдсэн / Published', value: 'published' },
      ],
    },
    {
      name: 'pdf',
      type: 'upload',
      relationTo: 'media',
      label: 'PDF файл / PDF',
      filterOptions: { mimeType: { equals: 'application/pdf' } },
    },
    {
      name: 'codeUrl',
      type: 'text',
      label: 'Кодын хаяг / Code URL',
      validate: (value: unknown) =>
        !value || (typeof value === 'string' && isHttpUrl(value))
          ? true
          : 'https:// -ээр эхлэх бүтэн хаяг / a full http(s) URL is required.',
    },
    {
      name: 'dataUrl',
      type: 'text',
      label: 'Өгөгдлийн хаяг / Data URL',
      validate: (value: unknown) =>
        !value || (typeof value === 'string' && isHttpUrl(value))
          ? true
          : 'https:// -ээр эхлэх бүтэн хаяг / a full http(s) URL is required.',
    },
    {
      name: 'citations',
      type: 'group',
      label: 'Эшлэл (автоматаар) / Citations (generated)',
      admin: {
        description:
          'Хадгалах болгонд дээрх талбаруудаас автоматаар бүрддэг. Generated from the fields above every time the paper is saved.',
      },
      fields: [
        {
          name: 'apa',
          type: 'textarea',
          label: 'APA',
          admin: { readOnly: true },
        },
        {
          name: 'bibtex',
          type: 'textarea',
          label: 'BibTeX',
          admin: { readOnly: true },
        },
      ],
    },
    seoField(),
  ],
};

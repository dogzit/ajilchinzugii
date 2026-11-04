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
      name: 'findings',
      type: 'array',
      label: 'Гол үр дүн / Key findings',
      admin: {
        description:
          'Энэ өгүүллийн өөрийн нийтэлсэн тоо, хаанаас авсан хэсгийн хамт. Эдгээр нь байгууллагын хэргийн бүртгэлийн тоо БИШ — тэд зөвхөн хүснэгтээс ирнэ. The paper’s own published figures, each with the place in the paper it is read from. These are not the organisation’s impact figures, which come only from the sheet.',
      },
      labels: { singular: 'Үр дүн / Finding', plural: 'Гол үр дүн / Key findings' },
      fields: [
        {
          name: 'value',
          type: 'text',
          required: true,
          // Localized because the unit is: "+38.6 нэгж хувь" and "+38.6 pp"
          // are the same figure, and "+15.3 цаг" / "+15.3 h" is the same
          // again. The digits do not change; the words after them do.
          localized: true,
          label: 'Тоо / Figure',
          admin: {
            description:
              'Өгүүлэлд бичигдсэн яг тэр хэлбэрээр, нэгжтэй нь: 10,900 · 82% · +38.6 нэгж хувь. Exactly as the paper writes it, with its unit.',
          },
        },
        {
          name: 'label',
          type: 'text',
          required: true,
          localized: true,
          label: 'Юуны тоо вэ / What it counts',
        },
        {
          name: 'source',
          type: 'text',
          required: true,
          localized: true,
          label: 'Өгүүллийн аль хэсэг / Where in the paper',
          admin: {
            description:
              'Уншигч нээж шалгах хэсэг: «Хураангуй», «5.3 бүлэг», «Хүснэгт 5.1». The passage a reader can open and check: “Abstract”, “Section 5.3”, “Table 5.1”.',
          },
        },
      ],
    },
    {
      name: 'comparison',
      type: 'group',
      label: 'Харьцуулалтын график / Comparison chart',
      admin: {
        description:
          'Хоёр бүлгийг үзүүлэлт тус бүрээр харьцуулсан график. Мөр нэмэхгүй бол график огт гарахгүй. A chart comparing two groups measure by measure. With no rows it is not rendered at all.',
      },
      fields: [
        {
          name: 'title',
          type: 'text',
          localized: true,
          label: 'Графикийн гарчиг / Chart title',
        },
        {
          name: 'groupALabel',
          type: 'text',
          localized: true,
          label: 'Нэгдүгээр бүлэг / First group',
        },
        {
          name: 'groupBLabel',
          type: 'text',
          localized: true,
          label: 'Хоёрдугаар бүлэг / Second group',
        },
        {
          name: 'note',
          type: 'textarea',
          localized: true,
          label: 'Эх сурвалжийн тэмдэглэл / Source note',
        },
        {
          name: 'rows',
          type: 'array',
          label: 'Мөрүүд / Rows',
          labels: { singular: 'Мөр / Row', plural: 'Мөрүүд / Rows' },
          fields: [
            {
              name: 'label',
              type: 'text',
              required: true,
              localized: true,
              label: 'Үзүүлэлт / Measure',
            },
            {
              name: 'groupA',
              type: 'number',
              required: true,
              min: 0,
              max: 100,
              label: 'Нэгдүгээр бүлэг (%) / First group (%)',
            },
            {
              name: 'groupB',
              type: 'number',
              required: true,
              min: 0,
              max: 100,
              label: 'Хоёрдугаар бүлэг (%) / Second group (%)',
            },
          ],
        },
      ],
    },
    {
      name: 'citations',
      type: 'group',
      label: 'Эшлэл (автоматаар) / Citations (generated)',
      // Localized because the title it quotes is localized: an APA/BibTeX
      // string built from the Mongolian title is wrong on the English page,
      // and a single shared slot can only ever hold one language's version.
      localized: true,
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

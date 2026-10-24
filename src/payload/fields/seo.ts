import type { Field } from 'payload';

/**
 * Localized SEO group, added to every public collection and global.
 *
 * Lengths follow what search engines actually display: ~60 characters for a
 * title, ~160 for a description. Both are enforced server-side with
 * `maxLength` and shown live by the character counter in the admin UI.
 *
 * Users are the one collection without this group: a user account is not a
 * public document and has no page to describe.
 */
export const seoField = (): Field => ({
  name: 'seo',
  type: 'group',
  label: 'SEO (хайлтын тохиргоо) / SEO',
  admin: {
    description:
      'Хайлтын үр дүн болон линкийн тойм дээр харагдана. Хоосон бол хуудасны гарчиг хэрэглэгдэнэ. Shown in search results and link previews. Leave empty to fall back to the page title.',
  },
  fields: [
    {
      name: 'metaTitle',
      type: 'text',
      localized: true,
      maxLength: 60,
      label: 'Meta гарчиг (дээд тал нь 60) / Meta title (max 60)',
      admin: {
        components: {
          Description: '@/payload/components/MetaCharCount#MetaCharCount',
        },
      },
    },
    {
      name: 'metaDescription',
      type: 'textarea',
      localized: true,
      maxLength: 160,
      label: 'Meta тайлбар (дээд тал нь 160) / Meta description (max 160)',
      admin: {
        components: {
          Description: '@/payload/components/MetaCharCount#MetaCharCount',
        },
      },
    },
  ],
});

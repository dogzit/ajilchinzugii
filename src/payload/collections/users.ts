import type { CollectionConfig } from 'payload';
import { canUseAdminPanel, isAdmin, isAdminField, isAdminOrSelf } from '../access';

/**
 * Staff accounts. There is no public sign-up: only an admin can create a
 * user. (Payload still allows creating the very first user while the table is
 * empty — that is how the client sets up their own admin account.)
 */
const adminUrl = (): string => {
  const base = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') ?? '';
  return `${base}/admin`;
};

/**
 * The password-reset message. Mongolian first, English under it, because the
 * same mailbox may be read by a translator or an outside collaborator.
 */
export function resetEmailHtml(token: string | undefined): string {
  const link = `${adminUrl()}/reset/${token ?? ''}`;
  return [
    '<div style="font-family:system-ui,sans-serif;font-size:15px;line-height:1.6;color:#1b1816">',
    '<p>Сайн байна уу,</p>',
    '<p>Та <strong>Ажилчин Зөгий</strong>-н админ хэсгийн нууц үгээ сэргээхийг хүссэн байна. ',
    'Доорх холбоосоор орж шинэ нууц үгээ тавина уу:</p>',
    `<p><a href="${link}">${link}</a></p>`,
    '<p>Энэ холбоос нэг удаа ажиллана. Хэрэв та хүсээгүй бол энэ захидлыг үл тоо — ',
    'нууц үг чинь хэвээр хэвээр үлдэнэ.</p>',
    '<hr style="border:0;border-top:1px solid #e3ded7;margin:20px 0">',
    '<p style="color:#5b5349;font-size:13px">You asked to reset your Ajilchin Z&ouml;gii admin password. ',
    'Open the link above to choose a new one. It works once; ignore this message if it was not you.</p>',
    '</div>',
  ].join('');
}

export const Users: CollectionConfig = {
  slug: 'users',
  labels: {
    singular: 'Хэрэглэгч / User',
    plural: 'Хэрэглэгчид / Users',
  },
  auth: {
    maxLoginAttempts: 5,
    lockTime: 10 * 60 * 1000,
    forgotPassword: {
      generateEmailSubject: () => 'Ажилчин Зөгий — нууц үг сэргээх / Password reset',
      // Payload's own template is English-only, and the admin panel is read
      // by Mongolian editors. The link is the token Payload generates; it is
      // the only part of the message that matters, so it is plainly visible
      // rather than hidden behind a styled button that mail clients strip.
      generateEmailHTML: (args) => resetEmailHtml(args?.token),
    },
  },
  admin: {
    useAsTitle: 'email',
    defaultColumns: ['name', 'email', 'role'],
    group: 'Тохиргоо / Settings',
  },
  access: {
    admin: canUseAdminPanel,
    create: isAdmin,
    read: isAdminOrSelf,
    update: isAdminOrSelf,
    delete: isAdmin,
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
      type: 'select',
      required: true,
      defaultValue: 'editor',
      // Only an admin can change a role — an editor cannot promote themselves.
      access: { create: isAdminField, update: isAdminField },
      options: [
        { label: 'Админ / Admin', value: 'admin' },
        { label: 'Редактор / Editor', value: 'editor' },
      ],
      label: 'Үүрэг / Role',
      admin: {
        description:
          'Админ хэрэглэгч, тохиргоог удирдана. Редактор агуулга бичнэ. Admins manage users and settings. Editors write content.',
      },
    },
  ],
};

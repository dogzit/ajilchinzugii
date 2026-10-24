import type { CollectionConfig } from 'payload';
import { canUseAdminPanel, isAdmin, isAdminField, isAdminOrSelf } from '../access';

/**
 * Staff accounts. There is no public sign-up: only an admin can create a
 * user. (Payload still allows creating the very first user while the table is
 * empty — that is how the client sets up their own admin account.)
 */
export const Users: CollectionConfig = {
  slug: 'users',
  labels: {
    singular: 'Хэрэглэгч / User',
    plural: 'Хэрэглэгчид / Users',
  },
  auth: {
    maxLoginAttempts: 5,
    lockTime: 10 * 60 * 1000,
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

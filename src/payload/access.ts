import type { Access, FieldAccess, PayloadRequest } from 'payload';

/**
 * Two roles: `admin` manages users and settings, `editor` writes content.
 * There is no public sign-up — only an admin can create a user.
 */
export type Role = 'admin' | 'editor';

export const isAdmin: Access = ({ req: { user } }) => user?.role === 'admin';

export const isStaff: Access = ({ req: { user } }) =>
  user?.role === 'admin' || user?.role === 'editor';

/**
 * Who may open the admin panel at all. `access.admin` has to return a plain
 * boolean — a query constraint is meaningless for a login.
 */
export const canUseAdminPanel = ({ req: { user } }: { req: PayloadRequest }): boolean =>
  user?.role === 'admin' || user?.role === 'editor';

export const isAdminField: FieldAccess = ({ req: { user } }) => user?.role === 'admin';

/** Admins see every user; everyone else only their own account. */
export const isAdminOrSelf: Access = ({ req: { user } }) => {
  if (!user) return false;
  if (user.role === 'admin') return true;
  return { id: { equals: user.id } };
};

/**
 * Public read for published documents only. Signed-in staff see drafts too,
 * which is what makes Payload's preview work.
 */
export const publishedOrStaff: Access = ({ req: { user } }) => {
  if (user) return true;
  return { _status: { equals: 'published' } };
};

/** Public read, no draft state on the collection. */
export const anyone: Access = () => true;

/** Nobody can write through the API or admin UI — only the server can. */
export const nobody: Access = () => false;

/**
 * Team members are listed publicly only once an adult has been confirmed as
 * such; minors are never listed individually (CLAUDE.md rule 4).
 */
export const confirmedAdultsOrStaff: Access = ({ req: { user } }) => {
  if (user) return true;
  return { confirmedAdult18Plus: { equals: true } };
};

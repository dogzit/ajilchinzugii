/**
 * Portable configuration. The domain and the contact address are never
 * hardcoded — they come from the environment (see `.env.example`).
 */
export const siteUrl = (
  process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
).replace(/\/$/, '');

export const contactEmail = process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? '';

/**
 * Portable configuration. The domain and the contact address are never
 * hardcoded — they come from the environment (see `.env.example`).
 */

const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();

/**
 * In production an unset site URL is not a small problem: canonical links,
 * hreflang, the sitemap, the share cards and the structured data would all be
 * published pointing at localhost, and a search engine would index them that
 * way. Fail the build instead (CLAUDE.md rule 9).
 */
if (!configured && process.env.NODE_ENV === 'production') {
  throw new Error(
    'NEXT_PUBLIC_SITE_URL is not set. Every public URL is built from it, so a ' +
      'production build without it would publish localhost addresses. Set it ' +
      'in the environment before building.',
  );
}

export const siteUrl = (configured || 'http://localhost:3000').replace(/\/$/, '');

export const contactEmail = process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? '';

import Script from 'next/script';

/**
 * Plausible, loaded only when a domain is configured.
 *
 * It sets no cookies and stores no personal data, so the site needs no consent
 * banner (CLAUDE.md: "no cookies, no banner"). The `file-downloads` and
 * `outbound-links` extensions are what record a PDF download and a click to
 * another site — as events, without a line of our own JavaScript on the page.
 */
export function Analytics() {
  const domain = process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN?.trim();
  if (!domain) return null;

  const host = (
    process.env.NEXT_PUBLIC_PLAUSIBLE_HOST?.trim() || 'https://plausible.io'
  ).replace(/\/$/, '');

  return (
    <Script
      defer
      data-domain={domain}
      // Downloads and outbound clicks arrive as "File Download" and
      // "Outbound Link: Click" events.
      src={`${host}/js/script.file-downloads.outbound-links.js`}
      strategy="afterInteractive"
    />
  );
}

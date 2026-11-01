'use client';

import { useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { boundaryMessages } from '@/i18n/boundary-messages';

/**
 * Something threw while rendering a page.
 *
 * It keeps the header, the footer and the language switch — the layout is
 * outside the boundary — so the reader is still on the site and can go
 * somewhere else. `reset()` re-renders the route, which is often enough when
 * the cause was a failed fetch.
 *
 * An error boundary is a client component and is handed no props, so its
 * text comes from the catalogues through `boundaryMessages` rather than from
 * next-intl's client runtime, which this site keeps out of the browser.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const params = useParams<{ locale?: string }>();
  const t = boundaryMessages(params?.locale);

  useEffect(() => {
    // The digest is what ties this screen to the server log. Nothing about
    // the reader, and nothing about the data, is written here.
    console.error('Page failed to render', error.digest ?? '');
  }, [error]);

  return (
    <div className="shell max-w-[62rem] py-14 md:py-20">
      <meta name="robots" content="noindex, nofollow" />

      <header className="border-border border-b pb-10">
        <h1 className="text-ink">{t.title}</h1>
        <p className="text-ink-muted mt-5 max-w-[60ch] text-lg leading-relaxed">
          {t.lead}
        </p>
      </header>

      <p className="mt-10">
        <Button onClick={reset}>{t.retry}</Button>
      </p>
    </div>
  );
}

import Link from 'next/link';
import type { Locale } from '@/i18n/routing';
import { localeHref } from '@/lib/locale-href';

/**
 * The invitation. One heading, one paragraph, one button — and the button
 * goes to the contact section of the about page, because the site collects
 * nothing itself (CLAUDE.md rule 5: publish only, no forms).
 */
export function Collaborate({
  locale,
  heading,
  body,
  cta,
}: {
  locale: Locale;
  heading: string;
  body: string;
  cta: string;
}) {
  return (
    <section
      aria-labelledby="collaborate"
      className="border-border bg-surface-muted border-b"
    >
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
        <h2
          id="collaborate"
          className="font-display text-ink max-w-[20ch] text-2xl sm:text-4xl"
        >
          {heading}
        </h2>
        <p className="text-ink-soft mt-5 max-w-[60ch] text-lg leading-relaxed">{body}</p>
        <p className="mt-8">
          <Link
            href={localeHref(locale, '/about#contact')}
            className="bg-ink text-bg hover:bg-accent inline-block rounded-sm px-5 py-3 text-sm font-semibold transition-colors"
          >
            {cta}
          </Link>
        </p>
      </div>
    </section>
  );
}

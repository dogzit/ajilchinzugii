'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { locales, type Locale } from '@/i18n/locales';

/**
 * Keeps the reader on the same page in the other language.
 *
 * Every label arrives as a prop and the path comes from Next's own
 * `usePathname`, so this carries no translation runtime into the browser. It
 * renders a real `<a href>`, server-side, which means it works before — and
 * without — JavaScript.
 *
 * The hash is kept too. It cannot go in the `href`, which is rendered on the
 * server and has to be the same string the reader can copy, so a reader who
 * followed "Хэрхэн тоолсон бэ?" to a counting rule and then switched
 * language is pushed to the same rule in the other language instead.
 */
export function LanguageSwitch({
  locale,
  target,
  currentLabel,
  targetLabel,
  switchLabel,
  className,
}: {
  locale: Locale;
  target: Locale;
  /** "Одоогийн хэл: Монгол", for a screen reader. */
  currentLabel: string;
  /** The other language's own name, e.g. "English". */
  targetLabel: string;
  /** The bilingual link label. */
  switchLabel: string;
  className?: string;
}) {
  const pathname = usePathname() ?? `/${locale}`;
  const router = useRouter();

  // Strip the locale segment, then put the other one in its place.
  const rest = locales.reduce(
    (path, code) =>
      path === `/${code}` ? '' : path.replace(new RegExp(`^/${code}(?=/|$)`), ''),
    pathname,
  );

  const href = `/${target}${rest}`;

  return (
    <div className={className}>
      <span className="sr-only">{currentLabel}</span>
      <Link
        href={href}
        hrefLang={target}
        onClick={(event) => {
          // Let the browser handle a middle click or a modified one: those
          // mean "open this somewhere else", and the hash is already in the
          // address the reader is copying.
          if (event.defaultPrevented || event.button !== 0) return;
          if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

          const hash = window.location.hash;
          if (!hash) return;

          event.preventDefault();
          router.push(`${href}${hash}`);
        }}
        data-testid="language-switch"
        className="border-border text-ink-soft hover:bg-surface-tint hover:text-ink inline-flex min-h-11 items-center gap-2 rounded-full border px-3 text-sm font-medium transition-colors sm:px-4"
      >
        {/*
          The mark is a drawing, not text, and the explanation lives inside the
          link rather than in an aria-label. WCAG 2.5.3 asks the accessible
          name to contain the visible text; an aria-label that replaced
          "English" with a Mongolian sentence broke that, and axe caught it.
        */}
        <svg
          viewBox="0 0 16 16"
          width="13"
          height="13"
          aria-hidden="true"
          focusable="false"
          className="text-accent-mark hidden shrink-0 min-[400px]:block"
        >
          <circle
            cx="8"
            cy="8"
            r="6.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          />
          <path
            d="M1.5 8h13M8 1.5c3 3 3 10 0 13M8 1.5c-3 3-3 10 0 13"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.2"
          />
        </svg>
        <span lang={target}>{targetLabel}</span>
        <span className="sr-only"> — {switchLabel}</span>
      </Link>
    </div>
  );
}

'use client';

import { useLocale, useTranslations } from 'next-intl';
import { Link, usePathname } from '@/i18n/navigation';
import { otherLocale, type Locale } from '@/i18n/routing';

/**
 * Keeps the reader on the same page in the other language. It renders a real
 * `<a href>` (server-rendered, so it works without client JS and is reachable
 * by keyboard) and is labelled in both languages.
 */
export function LanguageSwitch({ className }: { className?: string }) {
  const t = useTranslations('language');
  const locale = useLocale() as Locale;
  const target = otherLocale[locale];
  // `usePathname` returns the path without the locale prefix, so the link
  // points at the same page in the other language.
  const pathname = usePathname();

  return (
    <div className={className}>
      <span className="sr-only">{t('current', { language: t(`names.${locale}`) })}</span>
      <Link
        href={pathname}
        locale={target}
        // The label names both languages, so it is left in the page language;
        // only the language name itself is marked up as the other language.
        aria-label={t(`switchTo.${target}`)}
        data-testid="language-switch"
        className="border-border-strong text-ink-soft decoration-accent-mark hover:bg-surface-muted hover:text-ink inline-flex items-center gap-2 rounded-sm border px-3 py-1.5 text-sm underline decoration-1 underline-offset-4"
      >
        <span aria-hidden="true" className="num text-xs tracking-widest uppercase">
          {target}
        </span>
        <span lang={target}>{t(`names.${target}`)}</span>
      </Link>
    </div>
  );
}

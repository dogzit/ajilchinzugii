import { useTranslations } from 'next-intl';

/** First focusable element on every page. */
export function SkipLink() {
  const t = useTranslations('a11y');

  return (
    <a
      href="#main"
      className="focus:bg-surface focus:text-ink focus:outline-focus sr-only rounded-sm focus:not-sr-only focus:absolute focus:start-4 focus:top-4 focus:z-50 focus:px-4 focus:py-2 focus:shadow-sm focus:outline-2"
    >
      {t('skipToContent')}
    </a>
  );
}

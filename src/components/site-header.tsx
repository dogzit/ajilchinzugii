import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { LanguageSwitch } from '@/components/language-switch';
import { NavLinks } from '@/components/nav-links';

/**
 * The mobile menu is a native `<details>` element: it opens on click or on
 * Enter/Space, needs no client JS and never depends on `:hover`.
 */
export function SiteHeader() {
  const t = useTranslations();

  return (
    <header className="border-border bg-surface border-b">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-6 gap-y-3 px-4 py-4 sm:px-6">
        <Link
          href="/"
          className="font-display text-ink hover:decoration-accent-mark flex items-baseline gap-2 text-lg underline-offset-4 hover:underline"
        >
          <span aria-hidden="true" className="text-accent-mark">
            ●
          </span>
          {t('site.name')}
        </Link>

        <nav aria-label={t('a11y.primaryNav')} className="ms-auto hidden md:block">
          <NavLinks className="flex flex-wrap items-center gap-x-5 gap-y-1 text-sm" />
        </nav>

        <LanguageSwitch className="order-3 ms-auto md:order-none md:ms-0" />

        <details className="border-border order-4 w-full border-t pt-3 md:hidden">
          <summary className="text-ink-soft inline-flex cursor-pointer list-none items-center gap-2 rounded-sm px-1 py-1 text-sm [&::-webkit-details-marker]:hidden">
            <span aria-hidden="true" className="text-accent-mark">
              ☰
            </span>
            {t('a11y.menu')}
          </summary>
          <nav aria-label={t('a11y.primaryNav')} className="pt-3 pb-1">
            <NavLinks className="flex flex-col gap-1 text-base" linkClassName="py-2" />
          </nav>
        </details>
      </div>
    </header>
  );
}

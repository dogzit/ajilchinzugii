import { useTranslations } from 'next-intl';
import Link from 'next/link';
import type { Locale } from '@/i18n/routing';
import { localeHref } from '@/lib/locale-href';
import { otherLocale } from '@/i18n/routing';
import { LanguageSwitch } from '@/components/language-switch';
import { NavLinks } from '@/components/nav-links';

/**
 * Logo left, pages right, one call to action at the end.
 *
 * The mobile menu is a native `<details>` element: it opens on click or on
 * Enter/Space, announces its own expanded state, needs no client JS and never
 * depends on `:hover`.
 */
export function SiteHeader({ locale }: { locale: Locale }) {
  const t = useTranslations();
  const other = otherLocale[locale];

  return (
    <header className="border-border bg-bg/95 sticky top-0 z-30 border-b backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-3 px-4 py-4 sm:px-6">
        <Link
          href={localeHref(locale, '/')}
          className="font-display text-ink hover:decoration-accent-mark flex items-baseline gap-2 text-lg underline-offset-4 hover:underline"
        >
          <span aria-hidden="true" className="text-accent-mark">
            ●
          </span>
          {t('site.name')}
        </Link>

        <nav aria-label={t('a11y.primaryNav')} className="ms-auto hidden lg:block">
          <NavLinks
            locale={locale}
            className="flex flex-wrap items-center gap-x-6 gap-y-1 text-sm"
            exclude="home"
          />
        </nav>

        <div className="ms-auto flex items-center gap-3 lg:ms-0">
          <LanguageSwitch
            locale={locale}
            target={other}
            currentLabel={t('language.current', {
              language: t(`language.names.${locale}`),
            })}
            targetLabel={t(`language.names.${other}`)}
            switchLabel={t(`language.switchTo.${other}`)}
          />

          <Link
            href={localeHref(locale, '/about#contact')}
            className="bg-ink text-bg hover:bg-accent hidden rounded-sm px-4 py-2 text-sm font-semibold transition-colors sm:inline-block"
          >
            {t('nav.cta')}
          </Link>
        </div>

        <details className="border-border order-4 w-full border-t pt-3 lg:hidden">
          <summary className="text-ink-soft inline-flex cursor-pointer list-none items-center gap-2 rounded-sm px-1 py-1 text-sm [&::-webkit-details-marker]:hidden">
            <span aria-hidden="true" className="text-accent-mark">
              ☰
            </span>
            {t('a11y.menu')}
          </summary>
          <nav aria-label={t('a11y.primaryNav')} className="pt-3 pb-1">
            <NavLinks
              locale={locale}
              className="flex flex-col gap-1 text-base"
              linkClassName="py-2"
            />
          </nav>
          {/* The bar's call to action does not fit beside the logo on a
              phone, so it lives at the end of the menu instead. */}
          <Link
            href={localeHref(locale, '/about#contact')}
            className="bg-ink text-bg hover:bg-accent mt-3 mb-1 inline-block rounded-sm px-4 py-2 text-sm font-semibold transition-colors sm:hidden"
          >
            {t('nav.cta')}
          </Link>
        </details>
      </div>
    </header>
  );
}

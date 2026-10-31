import { useTranslations } from 'next-intl';
import Link from 'next/link';
import type { Locale } from '@/i18n/routing';
import { localeHref } from '@/lib/locale-href';
import { otherLocale } from '@/i18n/routing';
import { LanguageSwitch } from '@/components/language-switch';
import { NavLinks } from '@/components/nav-links';
import { ThemeToggle } from '@/components/theme-switch';
import { SiteWordmark } from '@/components/site-wordmark';
import { ButtonLink } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';

/**
 * Logo left, pages right, one call to action at the end.
 *
 * Below 860px the logo, the language pill and a hamburger share one line and
 * the pages drop underneath only when the menu is opened.
 *
 * The menu is a native `<details>`, which brings its own expanded state,
 * keyboard handling and Escape-to-close with no client JavaScript. Only the
 * hamburger and its panel live inside it — wrapping the whole bar in
 * `<details>` would hide the bar itself whenever the menu was closed, which
 * is exactly what the browser is supposed to do with a collapsed element.
 */
export function SiteHeader({ locale }: { locale: Locale }) {
  const logo = undefined;
  const t = useTranslations();
  const other = otherLocale[locale];

  return (
    <header className="border-border bg-bg/90 sticky top-0 z-30 border-b backdrop-blur">
      <div className="shell relative flex items-center gap-2 py-4 sm:gap-3">
        <Link
          href={localeHref(locale, '/')}
          className="font-display text-ink me-auto flex items-center gap-2 text-sm whitespace-nowrap sm:gap-2.5 sm:text-lg"
        >
          <SiteWordmark logo={logo} name={t('site.name')} locale={locale} />
        </Link>

        <nav aria-label={t('a11y.primaryNav')} className="me-2 hidden min-[860px]:block">
          <NavLinks
            locale={locale}
            className="flex items-center gap-x-7 text-sm"
            exclude="home"
          />
        </nav>

        <LanguageSwitch
          locale={locale}
          target={other}
          currentLabel={t('language.current', {
            language: t(`language.names.${locale}`),
          })}
          targetLabel={t(`language.names.${other}`)}
          switchLabel={t(`language.switchTo.${other}`)}
        />

        <ThemeToggle
          actions={{
            auto: t('theme.action', {
              current: t('theme.auto'),
              next: t('theme.light'),
            }),
            light: t('theme.action', {
              current: t('theme.light'),
              next: t('theme.dark'),
            }),
            dark: t('theme.action', {
              current: t('theme.dark'),
              next: t('theme.auto'),
            }),
          }}
        />

        <span className="hidden min-[860px]:block">
          <ButtonLink href={localeHref(locale, '/about#contact')}>
            {t('nav.cta')}
          </ButtonLink>
        </span>

        <details className="min-[860px]:hidden [&_summary::-webkit-details-marker]:hidden">
          <summary
            aria-label={t('a11y.menuToggle')}
            className="border-border text-ink inline-flex h-11 w-11 shrink-0 cursor-pointer list-none items-center justify-center rounded-full border"
          >
            <Icon name="menu" />
          </summary>

          {/* Full width, under the bar, so the pages read as one column. */}
          <div className="border-border bg-bg absolute inset-x-0 top-full border-b px-6 pt-3 pb-6 shadow-[var(--shadow-float)]">
            <nav aria-label={t('a11y.primaryNav')}>
              <NavLinks
                locale={locale}
                className="flex flex-col gap-0.5 text-base"
                linkClassName="py-2.5"
              />
            </nav>
            <ButtonLink
              href={localeHref(locale, '/about#contact')}
              size="lg"
              className="mt-4 w-full"
            >
              {t('nav.cta')}
            </ButtonLink>
          </div>
        </details>
      </div>
    </header>
  );
}

import { useTranslations } from 'next-intl';
import type { Site } from '@/payload-types';
import { otherLocale, type Locale } from '@/i18n/routing';
import { LanguageSwitch } from '@/components/language-switch';
import { NavLinks } from '@/components/nav-links';
import { ThemeSwitch } from '@/components/theme-switch';
import { contactEmail as contactEmailFromEnv } from '@/lib/site';
import { filledIn } from '@/lib/placeholder';

export function SiteFooter({
  locale,
  contactEmail,
  socialLinks,
  city,
}: {
  locale: Locale;
  contactEmail?: string | null;
  socialLinks?: Site['socialLinks'];
  city?: string | null;
}) {
  const t = useTranslations();
  const year = new Date().getFullYear();
  const other = otherLocale[locale];
  // The CMS is the source of truth; the env value keeps the footer filled
  // before the client has edited the Site global.
  const email = contactEmail || contactEmailFromEnv;
  const social = (socialLinks ?? []).filter((link) => link.platform && link.url);
  const place = filledIn(city);

  return (
    <footer className="border-border bg-surface-muted border-t">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:grid-cols-2 sm:px-6 lg:grid-cols-4">
        <div className="sm:col-span-2">
          <p className="font-display text-ink flex items-baseline gap-2 text-lg">
            <span aria-hidden="true" className="text-accent-mark">
              ●
            </span>
            {t('site.name')}
          </p>
          <p className="text-ink-muted mt-3 max-w-[42ch] text-sm">
            {t('footer.contactNote')}
          </p>

          <h2 className="text-ink-muted mt-8 text-xs tracking-[0.18em] uppercase">
            {t('footer.contactHeading')}
          </h2>
          {/* Publish only: a plain, selectable address — never a form. */}
          <p className="num text-ink mt-2 text-sm select-all">
            {email || t('footer.contactEmailMissing')}
          </p>

          {place ? (
            <>
              <h2 className="text-ink-muted mt-6 text-xs tracking-[0.18em] uppercase">
                {t('footer.addressHeading')}
              </h2>
              <p className="text-ink mt-2 text-sm">{place}</p>
            </>
          ) : null}
        </div>

        <nav aria-label={t('a11y.footerNav')}>
          <h2 className="text-ink-muted text-xs tracking-[0.18em] uppercase">
            {t('a11y.primaryNav')}
          </h2>
          <NavLinks locale={locale} className="mt-3 flex flex-col gap-1 text-sm" />
        </nav>

        <div className="flex flex-col gap-8">
          {social.length > 0 ? (
            <section>
              <h2 className="text-ink-muted text-xs tracking-[0.18em] uppercase">
                {t('footer.socialHeading')}
              </h2>
              <ul className="mt-3 flex flex-col gap-1 text-sm">
                {social.map((link) => (
                  <li key={link.id ?? link.url}>
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-ink-soft hover:text-ink hover:decoration-accent-mark underline-offset-4 hover:underline"
                    >
                      {link.platform}
                      <span className="sr-only"> {t('common.openInNewTab')}</span>
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <section>
            <h2 className="text-ink-muted text-xs tracking-[0.18em] uppercase">
              {t('language.label')}
            </h2>
            <LanguageSwitch
              locale={locale}
              target={other}
              currentLabel={t('language.current', {
                language: t(`language.names.${locale}`),
              })}
              targetLabel={t(`language.names.${other}`)}
              switchLabel={t(`language.switchTo.${other}`)}
              className="mt-3"
            />
          </section>

          <ThemeSwitch
            legend={t('theme.label')}
            labels={{
              auto: t('theme.auto'),
              light: t('theme.light'),
              dark: t('theme.dark'),
            }}
          />
        </div>
      </div>

      <div className="border-border text-ink-muted mx-auto max-w-6xl border-t px-4 py-5 text-sm sm:px-6">
        <p className="num">{t('footer.copyright', { year, name: t('site.name') })}</p>
        <p className="mt-1">{t('footer.sourceNote')}</p>
      </div>
    </footer>
  );
}

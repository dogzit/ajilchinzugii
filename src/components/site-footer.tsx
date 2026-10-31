import { useTranslations } from 'next-intl';
import type { Media, Site } from '@/payload-types';
import { otherLocale, type Locale } from '@/i18n/routing';
import { LanguageSwitch } from '@/components/language-switch';
import { NavLinks } from '@/components/nav-links';
import { SiteWordmark } from '@/components/site-wordmark';
import { ThemeSwitch } from '@/components/theme-switch';
import { contactEmail as contactEmailFromEnv } from '@/lib/site';
import { filledIn } from '@/lib/placeholder';

export function SiteFooter({
  locale,
  contactEmail,
  socialLinks,
  city,
  logo,
}: {
  locale: Locale;
  contactEmail?: string | null;
  socialLinks?: Site['socialLinks'];
  city?: string | null;
  logo?: number | Media | null;
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
    <footer className="border-border bg-surface-tint border-t">
      <div className="shell grid gap-10 py-16 sm:grid-cols-2 lg:grid-cols-4">
        <div className="sm:col-span-2">
          <p className="font-display text-ink flex items-center gap-2.5 text-lg">
            <SiteWordmark
              logo={logo}
              name={t('site.name')}
              locale={locale}
              size="footer"
            />
          </p>
          <p className="text-ink-muted mt-3 max-w-[42ch] text-sm">
            {t('footer.contactNote')}
          </p>

          <h2 className="text-ink-muted mt-8 text-xs font-semibold tracking-[0.16em] uppercase">
            {t('footer.contactHeading')}
          </h2>
          {/* Publish only: a plain, selectable address — never a form. */}
          <p className="num text-ink mt-2 text-sm select-all">
            {email || t('footer.contactEmailMissing')}
          </p>

          {place ? (
            <>
              <h2 className="text-ink-muted mt-6 text-xs font-semibold tracking-[0.16em] uppercase">
                {t('footer.addressHeading')}
              </h2>
              <p className="text-ink mt-2 text-sm">{place}</p>
            </>
          ) : null}
        </div>

        <nav aria-label={t('a11y.footerNav')}>
          <h2 className="text-ink-muted text-xs font-semibold tracking-[0.16em] uppercase">
            {t('nav.pages')}
          </h2>
          <NavLinks locale={locale} className="mt-3 flex flex-col gap-1 text-sm" />
        </nav>

        <div className="flex flex-col gap-8">
          {social.length > 0 ? (
            <section>
              <h2 className="text-ink-muted text-xs font-semibold tracking-[0.16em] uppercase">
                {t('footer.socialHeading')}
              </h2>
              <ul className="mt-3 flex flex-col gap-1 text-sm">
                {social.map((link) => (
                  <li key={link.id ?? link.url}>
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-ink-soft hover:text-ink transition-colors"
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
            <h2 className="text-ink-muted text-xs font-semibold tracking-[0.16em] uppercase">
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

      <div className="border-border text-ink-muted shell border-t py-6 text-sm">
        <p className="num">{t('footer.copyright', { year, name: t('site.name') })}</p>
        <p className="mt-1">{t('footer.sourceNote')}</p>
      </div>
    </footer>
  );
}

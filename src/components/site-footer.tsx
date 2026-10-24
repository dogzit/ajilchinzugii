import { useTranslations } from 'next-intl';
import { LanguageSwitch } from '@/components/language-switch';
import { NavLinks } from '@/components/nav-links';
import { contactEmail as contactEmailFromEnv } from '@/lib/site';

export function SiteFooter({ contactEmail }: { contactEmail?: string | null }) {
  const t = useTranslations();
  const year = new Date().getFullYear();
  // The CMS is the source of truth; the env value keeps the footer filled
  // before the client has edited the Site global.
  const email = contactEmail || contactEmailFromEnv;

  return (
    <footer className="border-border bg-surface-muted mt-16 border-t">
      <div className="mx-auto grid max-w-5xl gap-8 px-4 py-10 sm:px-6 md:grid-cols-3">
        <section>
          <h2 className="font-display text-ink text-sm tracking-wide">
            {t('footer.contactHeading')}
          </h2>
          <p className="text-ink-muted mt-2 max-w-prose text-sm">
            {t('footer.contactNote')}
          </p>
          {/* Publish only: a plain, selectable address — never a form. */}
          <p className="num text-ink mt-2 text-sm select-all">
            {email || t('footer.contactEmailMissing')}
          </p>
        </section>

        <nav aria-label={t('a11y.footerNav')}>
          <NavLinks className="flex flex-col gap-1 text-sm" />
        </nav>

        <section className="md:justify-self-end">
          <h2 className="font-display text-ink text-sm tracking-wide">
            {t('language.label')}
          </h2>
          <LanguageSwitch className="mt-2" />
        </section>
      </div>

      <div className="border-border text-ink-muted mx-auto max-w-5xl border-t px-4 py-5 text-sm sm:px-6">
        <p className="num">{t('footer.copyright', { year, name: t('site.name') })}</p>
        <p className="mt-1">{t('footer.sourceNote')}</p>
      </div>
    </footer>
  );
}

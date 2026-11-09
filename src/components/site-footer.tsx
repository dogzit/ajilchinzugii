import { useTranslations } from 'next-intl';
import type { Media, Site } from '@/payload-types';
import type { Locale } from '@/i18n/routing';
import { NavLinks } from '@/components/nav-links';
import { SiteWordmark } from '@/components/site-wordmark';
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
  // The CMS is the source of truth; the env value keeps the footer filled
  // before the client has edited the Site global.
  const email = contactEmail || contactEmailFromEnv;
  const social = (socialLinks ?? []).filter((link) => link.platform && link.url);
  const place = filledIn(city);

  return (
    <footer className="border-border bg-surface-tint border-t">
      {/*
        Four columns: the organisation on the left with room to breathe, then
        two narrow ones. Contact has a column of its own rather than sitting
        under the note, which is where the language switch used to be — the
        header carries that, and repeating it here only competed with the one
        thing a reader comes to a footer for, which is how to reach someone.
      */}
      <div className="shell grid gap-10 py-16 sm:grid-cols-2 lg:grid-cols-4">
        <div className="sm:col-span-2">
          <p className="font-display text-ink flex items-center gap-2.5 text-lg">
            <SiteWordmark logo={logo} name={t('site.name')} size="footer" />
          </p>
          <p className="text-ink-muted mt-4 max-w-[42ch] text-sm leading-relaxed">
            {t('footer.contactNote')}
          </p>
        </div>

        <nav aria-label={t('a11y.footerNav')}>
          <h2 className="text-ink-muted text-xs font-semibold tracking-[0.16em] uppercase">
            {t('nav.pages')}
          </h2>
          <NavLinks locale={locale} className="mt-3 flex flex-col gap-1 text-sm" />
        </nav>

        <div className="flex flex-col gap-7">
          <section>
            <h2 className="text-ink-muted text-xs font-semibold tracking-[0.16em] uppercase">
              {t('footer.contactHeading')}
            </h2>
            {/* Publish only: a plain, selectable address — never a form, and
                never a mailto that a scraper can harvest in one pass. */}
            <p className="num text-ink mt-3 text-sm break-words select-all">
              {email || t('footer.contactEmailMissing')}
            </p>
          </section>

          {place ? (
            <section>
              <h2 className="text-ink-muted text-xs font-semibold tracking-[0.16em] uppercase">
                {t('footer.addressHeading')}
              </h2>
              <p className="text-ink mt-3 text-sm">{place}</p>
            </section>
          ) : null}

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
        </div>
      </div>

      <div className="border-border text-ink-muted shell flex flex-col gap-1 border-t py-6 text-sm sm:flex-row sm:items-center sm:justify-between sm:gap-6">
        <p className="num">{t('footer.copyright', { year, name: t('site.name') })}</p>
        <p>{t('footer.sourceNote')}</p>
      </div>
    </footer>
  );
}

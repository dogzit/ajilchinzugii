import { getLocale, getTranslations } from 'next-intl/server';
import { ButtonLink } from '@/components/ui/button';
import { PageHeader } from '@/components/page-header';
import type { Locale } from '@/i18n/routing';
import { localeHref } from '@/lib/locale-href';
import { navItems } from '@/lib/nav';

/**
 * A page that is not there, in the reader's own language.
 *
 * It sits inside the locale layout, so it keeps the header, the footer and
 * the language switch: someone who followed a dead link from elsewhere lands
 * on a working site rather than a bare error, and can carry on from the list
 * of pages below.
 *
 * `not-found.tsx` cannot export metadata, so the robots tag is rendered in
 * place — React 19 hoists it into <head>. The response already carries a 404
 * status, which is the stronger signal, but a 404 that is also crawlable as
 * a soft page is a classic way to collect junk in a search index.
 */
export default async function NotFound() {
  const locale = (await getLocale()) as Locale;
  const t = await getTranslations({ locale });

  return (
    <div className="shell max-w-[62rem] py-14 md:py-20">
      <meta name="robots" content="noindex, follow" />

      <PageHeader title={t('notFound.title')} lead={t('notFound.lead')} />

      <p className="mt-10">
        <ButtonLink href={localeHref(locale, '/')}>{t('notFound.home')}</ButtonLink>
      </p>

      <nav aria-labelledby="not-found-pages" className="mt-12">
        <h2
          id="not-found-pages"
          className="text-ink-muted text-xs font-semibold tracking-[0.16em] uppercase"
        >
          {t('notFound.pages')}
        </h2>
        <ul className="mt-4 flex flex-wrap gap-x-6 gap-y-2">
          {navItems
            .filter((item) => item.path !== '/')
            .map((item) => (
              <li key={item.key}>
                <a
                  href={localeHref(locale, item.path)}
                  className="text-accent-text hover:text-ink underline underline-offset-4"
                >
                  {t(`nav.${item.key}`)}
                </a>
              </li>
            ))}
        </ul>
      </nav>
    </div>
  );
}

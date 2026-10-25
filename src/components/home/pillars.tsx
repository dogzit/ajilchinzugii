import { useTranslations } from 'next-intl';
import Link from 'next/link';
import type { Locale } from '@/i18n/routing';
import { pillars } from '@/lib/home-content';
import { localeHref } from '@/lib/locale-href';

/**
 * The three pillars, numbered.
 *
 * The numbers are not decoration: measuring, finding and changing happen in
 * that order, and the lead above says so. Each block is a row — label left,
 * prose right — so the eye runs down one column of headings rather than
 * zig-zagging across cards.
 */
export function Pillars({ locale }: { locale: Locale }) {
  const t = useTranslations();

  return (
    <section aria-labelledby="pillars" className="border-border border-b">
      <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
        <h2 id="pillars" className="font-display text-ink text-2xl sm:text-3xl">
          {t('home.pillarsHeading')}
        </h2>
        <p className="text-ink-muted mt-3 max-w-[60ch]">{t('home.pillarsLead')}</p>

        <div className="mt-12 flex flex-col">
          {pillars.map((pillar) => (
            <article
              key={pillar.key}
              className="border-border grid gap-x-12 gap-y-4 border-t py-10 md:grid-cols-[14rem_1fr]"
            >
              <div>
                <p className="num text-accent text-sm">{pillar.index}</p>
                <h3 className="font-display text-ink mt-2 text-xl sm:text-2xl">
                  {t(`pages.${pillar.key}.title`)}
                </h3>
              </div>

              <div className="max-w-[62ch]">
                <p className="text-ink text-lg leading-relaxed">
                  {t(`pages.${pillar.key}.lead`)}
                </p>
                <p className="text-ink-muted mt-4 leading-relaxed">
                  {t.rich(`home.pillarBody.${pillar.key}`, {
                    b: (chunks) => (
                      <strong className="text-ink font-semibold">{chunks}</strong>
                    ),
                  })}
                </p>
                <p className="mt-5">
                  <Link
                    href={localeHref(locale, `/${pillar.key}`)}
                    className="text-accent decoration-accent-mark hover:text-ink text-sm underline underline-offset-4"
                  >
                    {t('common.readMore')}
                    <span className="sr-only"> — {t(`pages.${pillar.key}.title`)}</span>
                  </Link>
                </p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

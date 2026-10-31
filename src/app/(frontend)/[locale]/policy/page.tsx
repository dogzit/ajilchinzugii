import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { PageHeader } from '@/components/page-header';
import { RichText } from '@/components/rich-text';
import { StatusBadge } from '@/components/status-badge';
import type { Locale } from '@/i18n/routing';
import { getPolicy } from '@/lib/cms';
import { formatDate, isRichTextEmpty, richTextHeadings } from '@/lib/format';
import { JsonLd } from '@/components/json-ld';
import { breadcrumbJsonLd } from '@/lib/seo/jsonld';
import { buildPageMetadata } from '@/lib/seo/metadata';

type Props = { params: Promise<{ locale: Locale }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const [t, doc] = await Promise.all([getTranslations({ locale }), getPolicy(locale)]);

  return buildPageMetadata({
    locale,
    path: '/policy',
    title: t('pages.policy.title'),
    description: t('pages.policy.lead'),
    seo: doc.seo,
  });
}

export default async function PolicyPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const [t, policy] = await Promise.all([getTranslations(), getPolicy(locale)]);

  // Newest first, so the current standing is at the top of the trail.
  const history = [...(policy.history ?? [])].sort((a, b) =>
    String(b.date).localeCompare(String(a.date)),
  );
  const headings = richTextHeadings(policy.fullText);

  return (
    <div className="shell max-w-[62rem] py-14 md:py-20">
      <JsonLd
        data={breadcrumbJsonLd(
          [
            { name: t('nav.home'), path: '/' },
            { name: t('pages.policy.title'), path: '/policy' },
          ],
          locale,
        )}
      />

      <PageHeader title={t('pages.policy.title')} lead={t('pages.policy.lead')} />

      <section aria-labelledby="status" className="mt-10">
        <h2 id="status" className="num text-ink-muted text-xs tracking-widest uppercase">
          {t('policy.statusHeading')}
        </h2>
        <div className="mt-3">
          <StatusBadge
            label={t(`policy.status.${policy.status}`)}
            date={policy.statusDate}
            locale={locale}
            tone={policy.status === 'adopted' ? 'accent' : 'neutral'}
          />
        </div>
        {policy.summary ? (
          <p className="text-ink-soft mt-6 max-w-[65ch] text-lg">{policy.summary}</p>
        ) : null}
      </section>

      {history.length > 0 ? (
        <section aria-labelledby="history" className="mt-14">
          <h2 id="history" className="text-xl">
            {t('policy.historyHeading')}
          </h2>
          {/* A vertical trail: one dated step per status change, never overwritten. */}
          <ol className="mt-6 flex max-w-[65ch] flex-col">
            {history.map((entry, index) => (
              <li
                key={entry.id ?? index}
                className="border-border relative flex gap-4 border-s ps-6 pb-8 last:border-transparent last:pb-0"
              >
                <span
                  aria-hidden="true"
                  className="bg-accent-mark absolute start-0 top-1.5 h-2 w-2 -translate-x-1/2 rounded-full rtl:translate-x-1/2"
                />
                <div className="flex flex-col gap-1">
                  <time
                    dateTime={String(entry.date).slice(0, 10)}
                    className="num text-ink-muted text-sm"
                  >
                    {formatDate(String(entry.date), locale)}
                  </time>
                  <p className="text-ink font-semibold">
                    {t(`policy.status.${entry.status}`)}
                  </p>
                  {entry.note ? <p className="text-ink-soft">{entry.note}</p> : null}
                </div>
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      {!isRichTextEmpty(policy.fullText) ? (
        <section
          aria-labelledby="fulltext"
          className="border-border mt-14 border-t pt-10"
        >
          <h2 id="fulltext" className="text-xl">
            {t('policy.fullTextHeading')}
          </h2>

          <div className="mt-6 lg:grid lg:grid-cols-[minmax(0,1fr)_14rem] lg:gap-12">
            <div className="order-2">
              <RichText data={policy.fullText} />
            </div>

            {headings.length > 1 ? (
              <nav
                aria-labelledby="toc"
                className="order-1 mb-8 lg:sticky lg:top-6 lg:mb-0 lg:self-start"
              >
                <h3
                  id="toc"
                  className="num text-ink-muted text-xs tracking-widest uppercase"
                >
                  {t('policy.tocHeading')}
                </h3>
                <ol className="mt-3 flex flex-col gap-1.5">
                  {headings.map((heading) => (
                    <li
                      key={heading.id}
                      style={{ paddingInlineStart: `${(heading.level - 2) * 0.75}rem` }}
                    >
                      <a
                        href={`#${heading.id}`}
                        className="text-ink-soft hover:text-accent-text text-sm underline-offset-4 hover:underline"
                      >
                        {heading.text}
                      </a>
                    </li>
                  ))}
                </ol>
              </nav>
            ) : null}
          </div>
        </section>
      ) : null}
    </div>
  );
}

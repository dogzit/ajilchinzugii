import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { PageHeader } from '@/components/page-header';
import { RichText } from '@/components/rich-text';
import type { Locale } from '@/i18n/routing';
import { getMethodology } from '@/lib/cms';
import { formatDate, isRichTextEmpty } from '@/lib/format';
import { JsonLd } from '@/components/json-ld';
import { breadcrumbJsonLd } from '@/lib/seo/jsonld';
import { buildPageMetadata } from '@/lib/seo/metadata';

type Props = { params: Promise<{ locale: Locale }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const [t, doc] = await Promise.all([
    getTranslations({ locale }),
    getMethodology(locale),
  ]);

  return buildPageMetadata({
    locale,
    path: '/methodology',
    title: t('pages.methodology.title'),
    description: t('pages.methodology.lead'),
    seo: doc.seo,
  });
}

export default async function MethodologyPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const [t, methodology] = await Promise.all([getTranslations(), getMethodology(locale)]);

  const sources = methodology.sources ?? [];
  const definitions = methodology.definitions ?? [];
  const countingRules = methodology.countingRules ?? [];
  // Newest change first: the reader wants to know what moved most recently.
  const changeLog = [...(methodology.changeLog ?? [])].sort((a, b) =>
    String(b.date).localeCompare(String(a.date)),
  );

  return (
    <div className="shell max-w-[62rem] py-14 md:py-20">
      <JsonLd
        data={breadcrumbJsonLd(
          [
            { name: t('nav.home'), path: '/' },
            { name: t('pages.methodology.title'), path: '/methodology' },
          ],
          locale,
        )}
      />

      <PageHeader
        title={t('pages.methodology.title')}
        lead={t('pages.methodology.lead')}
      />

      {sources.length > 0 ? (
        <section aria-labelledby="sources" className="mt-12">
          <h2 id="sources" className="text-xl">
            {t('methodology.sourcesHeading')}
          </h2>
          <ul className="mt-4 flex max-w-[65ch] flex-col gap-4">
            {sources.map((source, index) => (
              <li key={source.id ?? index} className="border-border border-t pt-3">
                <p className="text-ink">
                  {source.url ? (
                    <a
                      href={source.url}
                      className="text-accent-text decoration-accent-mark hover:text-ink underline underline-offset-4"
                      rel="noreferrer"
                    >
                      {source.title}
                    </a>
                  ) : (
                    source.title
                  )}
                </p>
                {source.note ? (
                  <p className="text-ink-muted mt-1 text-sm">{source.note}</p>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {definitions.length > 0 ? (
        <section aria-labelledby="definitions" className="mt-14">
          <h2 id="definitions" className="text-xl">
            {t('methodology.definitionsHeading')}
          </h2>
          <dl className="mt-4 flex max-w-[65ch] flex-col gap-6">
            {definitions.map((definition, index) => (
              // The anchor is the published address of this rule: a figure on
              // the impact page links straight here.
              <div
                key={definition.id ?? index}
                id={definition.anchorId}
                className="border-border scroll-mt-24 border-t pt-3"
              >
                <dt className="text-ink flex items-baseline gap-2 font-semibold">
                  {definition.term}
                  <a
                    href={`#${definition.anchorId}`}
                    aria-label={t('methodology.anchorLabel')}
                    className="num text-ink-muted hover:text-accent-text text-xs"
                  >
                    #
                  </a>
                </dt>
                <dd className="text-ink-soft mt-1">{definition.definition}</dd>
              </div>
            ))}
          </dl>
        </section>
      ) : null}

      {countingRules.length > 0 ? (
        <section aria-labelledby="counting" className="mt-14">
          <h2 id="counting" className="text-xl">
            {t('methodology.countingHeading')}
          </h2>
          <dl className="mt-4 flex max-w-[65ch] flex-col gap-6">
            {countingRules.map((rule, index) => (
              <div
                key={rule.id ?? index}
                id={rule.anchorId}
                className="border-border scroll-mt-24 border-t pt-3"
              >
                <dt className="text-ink flex items-baseline gap-2 font-semibold">
                  {rule.rule}
                  <a
                    href={`#${rule.anchorId}`}
                    aria-label={t('methodology.anchorLabel')}
                    className="num text-ink-muted hover:text-accent-text text-xs"
                  >
                    #
                  </a>
                </dt>
                <dd className="text-ink-soft mt-1">{rule.detail}</dd>
              </div>
            ))}
          </dl>
        </section>
      ) : null}

      {!isRichTextEmpty(methodology.limitations) ? (
        <section aria-labelledby="limitations" className="mt-14">
          <h2 id="limitations" className="text-xl">
            {t('methodology.limitationsHeading')}
          </h2>
          <div className="mt-4">
            <RichText data={methodology.limitations} />
          </div>
        </section>
      ) : null}

      {changeLog.length > 0 ? (
        <section aria-labelledby="changelog" className="mt-14">
          <h2 id="changelog" className="text-xl">
            {t('methodology.changeLogHeading')}
          </h2>
          <ol className="mt-4 flex max-w-[65ch] flex-col gap-4">
            {changeLog.map((entry, index) => (
              <li
                key={entry.id ?? index}
                className="border-border grid gap-1 border-t pt-3 sm:grid-cols-[9rem_minmax(0,1fr)] sm:gap-4"
              >
                <time
                  dateTime={String(entry.date).slice(0, 10)}
                  className="num text-ink-muted text-sm"
                >
                  {formatDate(String(entry.date), locale)}
                </time>
                <p className="text-ink-soft">{entry.summary}</p>
              </li>
            ))}
          </ol>
        </section>
      ) : null}
    </div>
  );
}

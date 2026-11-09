import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { PageHeader } from '@/components/page-header';
import { Icon } from '@/components/ui/icon';
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
    description: t('pages.methodology.description'),
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

  const updated = changeLog[0]?.date
    ? formatDate(String(changeLog[0].date), locale)
    : null;

  // Built from the sections this page actually has, so a jump link never
  // points at an anchor that is not here.
  const contents = [
    sources.length > 0
      ? { id: 'sources', label: t('methodology.sourcesHeading'), n: sources.length }
      : null,
    definitions.length > 0
      ? {
          id: 'definitions',
          label: t('methodology.definitionsHeading'),
          n: definitions.length,
        }
      : null,
    countingRules.length > 0
      ? {
          id: 'counting',
          label: t('methodology.countingHeading'),
          n: countingRules.length,
        }
      : null,
    !isRichTextEmpty(methodology.limitations)
      ? { id: 'limitations', label: t('methodology.limitationsHeading'), n: null }
      : null,
    changeLog.length > 0
      ? { id: 'changelog', label: t('methodology.changeLogHeading'), n: changeLog.length }
      : null,
  ].filter((entry): entry is { id: string; label: string; n: number | null } =>
    Boolean(entry),
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

      {/*
        This page is long by nature — twenty-seven definitions and fifteen
        counting rules — and a reader arriving from a figure on the impact
        page wants one of them, not all of them. The strip says how much
        there is and goes straight to it, so the length reads as thorough
        rather than as a wall.
      */}
      {contents.length > 1 ? (
        <nav aria-labelledby="contents" className="mt-10">
          <h2 id="contents" className="sr-only">
            {t('methodology.contentsHeading')}
          </h2>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {contents.map((entry) => (
              <li key={entry.id}>
                <a
                  href={`#${entry.id}`}
                  className="border-border bg-surface hover:border-accent-mark group flex items-baseline justify-between gap-3 rounded-2xl border px-4 py-3 transition-colors"
                >
                  <span className="text-ink text-sm font-medium">{entry.label}</span>
                  {entry.n !== null ? (
                    <span className="num text-ink-muted text-xs">{entry.n}</span>
                  ) : (
                    <Icon
                      name="arrow-right"
                      className="text-ink-muted group-hover:text-accent-text h-4 w-4 shrink-0"
                    />
                  )}
                </a>
              </li>
            ))}
          </ul>
          {updated ? (
            <p className="num text-ink-muted mt-4 text-sm">
              {t('methodology.lastUpdated')}: {updated}
            </p>
          ) : null}
        </nav>
      ) : null}

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
          {/* Two columns rather than one: twenty-seven terms stacked in a
              single thin column is the thing that reads as endless. Each is
              a card, so a term found from an anchor link is a distinct
              object on the page rather than one more paragraph. */}
          <dl className="mt-6 grid gap-4 sm:grid-cols-2">
            {definitions.map((definition, index) => (
              // The anchor is the published address of this rule: a figure on
              // the impact page links straight here.
              <div
                key={definition.id ?? index}
                id={definition.anchorId}
                className="border-border bg-surface target:border-accent-mark flex scroll-mt-24 flex-col gap-1.5 rounded-3xl border p-5"
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
                <dd className="text-ink-soft text-sm leading-relaxed">
                  {definition.definition}
                </dd>
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
          {/* Numbered: these are a set of rules applied in order, and a
              number gives a reader something to hold on to and to quote
              back — "rule 7" is citable in a way a paragraph is not. */}
          <dl className="mt-6 flex flex-col gap-4">
            {countingRules.map((rule, index) => (
              // A grid rather than nested flex wrappers: a <dl> may hold one
              // level of <div>, and <dt>/<dd> have to be its direct children.
              // Wrapping them in a second <div> to lay them out beside the
              // number broke the list's semantics outright.
              <div
                key={rule.id ?? index}
                id={rule.anchorId}
                className="border-border bg-surface grid scroll-mt-24 grid-cols-[auto_minmax(0,1fr)] items-baseline gap-x-4 gap-y-1.5 rounded-3xl border p-5 sm:gap-x-5"
              >
                <span
                  aria-hidden="true"
                  className="num font-display text-accent-text row-span-2 text-lg leading-tight tabular-nums"
                >
                  {String(index + 1).padStart(2, '0')}
                </span>
                <dt className="text-ink flex items-baseline gap-2 font-semibold">
                  <span className="sr-only">
                    {t('methodology.ruleNumber', { number: index + 1 })}:{' '}
                  </span>
                  {rule.rule}
                  <a
                    href={`#${rule.anchorId}`}
                    aria-label={t('methodology.anchorLabel')}
                    className="num text-ink-muted hover:text-accent-text text-xs"
                  >
                    #
                  </a>
                </dt>
                <dd className="text-ink-soft text-sm leading-relaxed">{rule.detail}</dd>
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
          {/* The same timeline the policy page uses for its history, so the
              two read as one site rather than two. */}
          <ol className="mt-6 flex max-w-[65ch] flex-col">
            {changeLog.map((entry, index) => (
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
                  <p className="text-ink-soft">{entry.summary}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>
      ) : null}
    </div>
  );
}

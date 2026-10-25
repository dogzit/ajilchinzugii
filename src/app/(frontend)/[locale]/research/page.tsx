import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { PageHeader } from '@/components/page-header';
import Link from 'next/link';
import type { Locale } from '@/i18n/routing';
import { getPapers } from '@/lib/cms';
import { localeHref } from '@/lib/locale-href';
import { JsonLd } from '@/components/json-ld';
import { breadcrumbJsonLd } from '@/lib/seo/jsonld';
import { buildPageMetadata } from '@/lib/seo/metadata';

type Props = { params: Promise<{ locale: Locale }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale });

  return buildPageMetadata({
    locale,
    path: '/research',
    title: t('pages.research.title'),
    description: t('pages.research.lead'),
  });
}

export default async function ResearchPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const [t, papers] = await Promise.all([getTranslations(), getPapers(locale)]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
      <JsonLd
        data={breadcrumbJsonLd(
          [
            { name: t('nav.home'), path: '/' },
            { name: t('pages.research.title'), path: '/research' },
          ],
          locale,
        )}
      />

      <PageHeader title={t('pages.research.title')} lead={t('pages.research.lead')} />

      {papers.length === 0 ? (
        <p className="text-ink-muted mt-10 max-w-[65ch]">{t('common.nothingYet')}</p>
      ) : (
        <ul className="mt-10 flex flex-col">
          {papers.map((paper) => (
            <li
              key={paper.id}
              className="border-border bg-surface mb-4 rounded-sm border p-5"
            >
              <article className="flex flex-col gap-2">
                <div className="num text-ink-muted flex flex-wrap items-baseline gap-x-3 text-xs">
                  {paper.year ? <span>{paper.year}</span> : null}
                  <span>{t(`research.status.${paper.status}`)}</span>
                </div>
                <h2 className="text-lg">
                  <Link
                    href={localeHref(locale, `/research/${paper.slug}`)}
                    className="text-ink hover:decoration-accent-mark underline-offset-4 hover:underline"
                  >
                    {paper.title}
                  </Link>
                </h2>
                {paper.venue ? (
                  <p className="text-ink-muted max-w-[65ch] text-sm">{paper.venue}</p>
                ) : null}
                {paper.authors?.length ? (
                  <p className="text-ink-soft max-w-[65ch] text-sm">
                    {paper.authors.map((author) => author.name).join(', ')}
                  </p>
                ) : null}

                {/* What the paper carries, before the reader opens it. */}
                <ul className="mt-1 flex flex-wrap gap-2">
                  {[
                    typeof paper.pdf === 'object' && paper.pdf?.url
                      ? { key: 'pdf', label: t('research.pdf') }
                      : null,
                    paper.codeUrl ? { key: 'code', label: t('research.code') } : null,
                    paper.dataUrl ? { key: 'data', label: t('research.data') } : null,
                  ]
                    .filter((chip): chip is { key: string; label: string } =>
                      Boolean(chip),
                    )
                    .map((chip) => (
                      <li
                        key={chip.key}
                        className="border-border text-ink-muted rounded-sm border px-2 py-0.5 text-xs"
                      >
                        {chip.label}
                      </li>
                    ))}
                </ul>
              </article>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

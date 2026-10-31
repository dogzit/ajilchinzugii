import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { CitationBlock } from '@/components/citation-block';
import { JsonLd } from '@/components/json-ld';
import { RichText } from '@/components/rich-text';
import Link from 'next/link';
import { routing, type Locale } from '@/i18n/routing';
import { getPaper, getPaperSlugs } from '@/lib/cms';
import { localeHref } from '@/lib/locale-href';
import { isRichTextEmpty, lexicalText } from '@/lib/format';
import {
  breadcrumbJsonLd,
  scholarlyArticleJsonLd,
  scholarMetaTags,
} from '@/lib/seo/jsonld';
import { buildPageMetadata } from '@/lib/seo/metadata';

type Props = { params: Promise<{ locale: Locale; slug: string }> };

export async function generateStaticParams() {
  const slugs = await getPaperSlugs();
  return routing.locales.flatMap((locale) => slugs.map((slug) => ({ locale, slug })));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const paper = await getPaper(slug, locale);
  if (!paper) return {};

  const abstract = lexicalText(paper.abstract?.root as never).trim();

  return buildPageMetadata({
    locale,
    path: `/research/${slug}`,
    title: paper.title,
    description: abstract || undefined,
    seo: paper.seo,
    kind: 'paper',
    // Google Scholar reads these, not the JSON-LD below.
    other: scholarMetaTags(paper),
  });
}

/** A download or an external resource, rendered as one row of buttons. */
function ResourceLink({
  href,
  label,
  download,
}: {
  href: string;
  label: string;
  download?: boolean;
}) {
  return (
    <a
      href={href}
      {...(download ? {} : { rel: 'noreferrer' })}
      className="border-border-strong text-ink-soft hover:bg-surface-tint hover:text-ink inline-flex min-h-11 items-center gap-2 rounded-full border px-4 text-sm font-medium"
    >
      <span aria-hidden="true" className="text-accent-mark">
        ↓
      </span>
      {label}
    </a>
  );
}

export default async function PaperPage({ params }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const [t, paper] = await Promise.all([getTranslations(), getPaper(slug, locale)]);
  if (!paper) notFound();

  const pdf = typeof paper.pdf === 'object' && paper.pdf ? paper.pdf : null;
  const abstract = lexicalText(paper.abstract?.root as never).trim();

  return (
    <div className="shell max-w-[62rem] py-14 md:py-20">
      <JsonLd
        data={[
          scholarlyArticleJsonLd(paper, locale, abstract),
          breadcrumbJsonLd(
            [
              { name: t('nav.home'), path: '/' },
              { name: t('pages.research.title'), path: '/research' },
              { name: paper.title, path: `/research/${slug}` },
            ],
            locale,
          ),
        ]}
      />
      <p className="mb-8">
        <Link
          href={localeHref(locale, '/research')}
          className="text-accent-text decoration-accent-mark hover:text-ink text-sm underline underline-offset-4"
        >
          ← {t('research.backToList')}
        </Link>
      </p>

      <article>
        <header className="border-border border-b pb-8">
          <div className="num text-ink-muted flex flex-wrap items-baseline gap-x-4 text-xs">
            {paper.year ? <span>{paper.year}</span> : null}
            <span>{t(`research.status.${paper.status}`)}</span>
          </div>
          <h1 className="mt-3 text-3xl sm:text-4xl">{paper.title}</h1>
          {paper.authors?.length ? (
            <p className="text-ink-soft mt-4 max-w-[65ch]">
              {paper.authors.map((author) => author.name).join(', ')}
            </p>
          ) : null}
          {paper.venue ? (
            <p className="text-ink-muted mt-1 max-w-[65ch] text-sm">{paper.venue}</p>
          ) : null}
        </header>

        {pdf?.url || paper.codeUrl || paper.dataUrl ? (
          <div className="mt-6 flex flex-wrap gap-3">
            {pdf?.url ? (
              <ResourceLink href={pdf.url} label={t('research.pdf')} download />
            ) : null}
            {paper.codeUrl ? (
              <ResourceLink href={paper.codeUrl} label={t('research.code')} />
            ) : null}
            {paper.dataUrl ? (
              <ResourceLink href={paper.dataUrl} label={t('research.data')} />
            ) : null}
          </div>
        ) : null}

        {!isRichTextEmpty(paper.abstract) ? (
          <section aria-labelledby="abstract" className="mt-10">
            <h2 id="abstract" className="text-xl">
              {t('research.abstractHeading')}
            </h2>
            <div className="mt-3">
              <RichText data={paper.abstract} />
            </div>
          </section>
        ) : null}

        <CitationBlock apa={paper.citations?.apa} bibtex={paper.citations?.bibtex} />
      </article>
    </div>
  );
}

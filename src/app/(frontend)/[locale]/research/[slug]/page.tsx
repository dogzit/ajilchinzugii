import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { JsonLd } from '@/components/json-ld';
import { PaperArticle } from '@/components/paper-article';
import { Link } from '@/components/link';
import { routing, type Locale } from '@/i18n/routing';
import { getPaper, getPaperSlugs } from '@/lib/cms';
import { localeHref } from '@/lib/locale-href';
import { lexicalText } from '@/lib/format';
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

export default async function PaperPage({ params }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const [t, paper] = await Promise.all([getTranslations(), getPaper(slug, locale)]);
  if (!paper) notFound();

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

      <PaperArticle paper={paper} t={t} locale={locale} headingLevel="h1" />
    </div>
  );
}

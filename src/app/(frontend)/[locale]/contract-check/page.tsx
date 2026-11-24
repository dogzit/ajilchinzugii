import type { Metadata } from 'next';
import { getMessages, getTranslations, setRequestLocale } from 'next-intl/server';
import { ContractRater } from '@/components/rater/contract-rater';
import type { RaterMessages } from '@/components/rater/types';
import type { Locale } from '@/i18n/routing';
import { getSite } from '@/lib/cms';
import { localeHref } from '@/lib/locale-href';
import { publishable } from '@/lib/placeholder';
import { raterCategories, raterRuleTexts } from '@/lib/rater/texts';
import { buildPageMetadata } from '@/lib/seo/metadata';

type Props = { params: Promise<{ locale: Locale }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'rater.meta' });
  const metadata = await buildPageMetadata({
    locale,
    path: '/contract-check',
    title: t('title'),
    description: t('description'),
  });
  // A tool, not a document: results are personal and the page is never indexed.
  return { ...metadata, robots: { index: false, follow: false, nocache: true } };
}

export default async function ContractCheckPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [messages, site] = await Promise.all([getMessages({ locale }), getSite(locale)]);

  return (
    <div className="shell py-12 md:py-16">
      <ContractRater
        t={(messages as { rater: RaterMessages }).rater}
        rules={raterRuleTexts(locale)}
        categories={raterCategories(locale)}
        locale={locale}
        privacyHref={localeHref(locale, '/privacy')}
        contactEmail={publishable(site.contactEmail) ?? null}
      />
    </div>
  );
}

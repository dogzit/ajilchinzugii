import type { Metadata } from 'next';
import { getMessages, getTranslations, setRequestLocale } from 'next-intl/server';
import { CvRater, type CvMessages } from '@/components/rater/cv-rater';
import type { RaterMessages } from '@/components/rater/types';
import type { Locale } from '@/i18n/routing';
import { AIMAGS } from '@/lib/aimags';
import { localeHref } from '@/lib/locale-href';
import { ruleSet } from '@/lib/rater/rule-set';
import { cvRuleTexts, raterCategories } from '@/lib/rater/texts';
import { buildPageMetadata } from '@/lib/seo/metadata';

type Props = { params: Promise<{ locale: Locale }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'cv.meta' });
  const metadata = await buildPageMetadata({ locale, path: '/cv-check', title: t('title'), description: t('description') });
  return { ...metadata, robots: { index: false, follow: false, nocache: true } };
}

export default async function CvCheckPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const messages = (await getMessages({ locale })) as { rater: RaterMessages; cv: CvMessages; common: { aimags: Record<string, string> } };

  return (
    <div className="shell py-12 md:py-16">
      <CvRater
        locale={locale}
        t={messages.cv}
        raterT={messages.rater}
        rules={cvRuleTexts(locale)}
        categories={raterCategories(locale)}
        prohibitedForMinors={ruleSet.a122_prohibited}
        aimags={AIMAGS.map((id) => ({ id, name: messages.common.aimags[id] ?? id }))}
        contractHref={localeHref(locale, '/contract-check')}
      />
    </div>
  );
}

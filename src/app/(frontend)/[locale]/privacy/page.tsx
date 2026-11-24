import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { PageHeader } from '@/components/page-header';
import { Icon } from '@/components/ui/icon';
import type { Locale } from '@/i18n/routing';
import { buildPageMetadata } from '@/lib/seo/metadata';

type Props = { params: Promise<{ locale: Locale }> };

const SECTIONS = ['what', 'kept', 'who', 'cases', 'retention', 'deletion', 'minors', 'contact'] as const;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'privacy' });
  return buildPageMetadata({ locale, path: '/privacy', title: t('title'), description: t('lead') });
}

/** What the tools process, who processes it, how long it is kept, and how to delete it. */
export default async function PrivacyPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'privacy' });

  return (
    <div className="shell max-w-[52rem] py-14 md:py-20">
      <PageHeader title={t('title')} lead={t('lead')} />
      <p role="note" className="border-score-amber bg-surface text-ink mt-8 flex gap-3 rounded-2xl border-s-4 px-4 py-3">
        <Icon name="verdict-yellow" className="text-score-amber mt-0.5 h-5 w-5 shrink-0" />
        <span>{t('draft')}</span>
      </p>
      <div className="mt-10 grid gap-10">
        {SECTIONS.map((key) => (
          <section key={key} aria-labelledby={`privacy-${key}`}>
            <h2 id={`privacy-${key}`} className="text-ink">
              {t(`sections.${key}.title`)}
            </h2>
            <p className="text-ink-soft mt-4 max-w-[65ch] text-lg leading-relaxed">{t(`sections.${key}.body`)}</p>
          </section>
        ))}
      </div>
    </div>
  );
}

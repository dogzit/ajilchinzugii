import { getTranslations } from 'next-intl/server';
import type { PageKey } from '@/lib/nav';

/**
 * Phase 1 page body. The real content arrives in later phases; until then each
 * page is explicitly marked as pending rather than filled with invented copy.
 */
export async function PlaceholderPage({ pageKey }: { pageKey: PageKey }) {
  const t = await getTranslations();

  return (
    <article className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
      <h1 className="text-3xl sm:text-4xl">{t(`pages.${pageKey}.title`)}</h1>
      <p className="text-ink-soft mt-4 max-w-prose text-lg">
        {t(`pages.${pageKey}.lead`)}
      </p>

      <p className="num border-border-strong bg-accent-surface text-ink mt-10 inline-block rounded-sm border px-3 py-1.5 text-sm">
        {t('placeholder.tbd')}
      </p>
      <p className="text-ink-muted mt-3 max-w-prose text-sm">{t('placeholder.note')}</p>
    </article>
  );
}

import { useTranslations } from 'next-intl';
import { CopyButton } from '@/components/copy-button';

/**
 * APA and BibTeX, generated when the paper was saved. Shown as selectable text
 * with a copy button, because a researcher will do one or the other.
 */
export function CitationBlock({
  apa,
  bibtex,
}: {
  apa?: string | null;
  bibtex?: string | null;
}) {
  const t = useTranslations('research');
  if (!apa && !bibtex) return null;

  return (
    <section aria-labelledby="citation" className="border-border mt-12 border-t pt-8">
      <h2 id="citation" className="text-xl">
        {t('citationHeading')}
      </h2>

      <div className="mt-4 flex flex-col gap-6">
        {apa ? (
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-4">
              <h3 className="num text-ink-muted text-xs tracking-widest uppercase">
                {t('apa')}
              </h3>
              <CopyButton value={apa} label={t('apa')} />
            </div>
            <p className="num border-border bg-surface-muted text-ink max-w-[65ch] rounded-sm border px-4 py-3 text-sm break-words select-all">
              {apa}
            </p>
          </div>
        ) : null}

        {bibtex ? (
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-4">
              <h3 className="num text-ink-muted text-xs tracking-widest uppercase">
                {t('bibtex')}
              </h3>
              <CopyButton value={bibtex} label={t('bibtex')} />
            </div>
            <pre className="num border-border bg-surface-muted text-ink max-w-full overflow-x-auto rounded-sm border px-4 py-3 text-sm select-all">
              <code>{bibtex}</code>
            </pre>
          </div>
        ) : null}
      </div>
    </section>
  );
}

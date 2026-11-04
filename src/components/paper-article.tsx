import { CitationBlock } from '@/components/citation-block';
import { RichText } from '@/components/rich-text';
import type { Paper } from '@/payload-types';
import type { getTranslations } from 'next-intl/server';
import { isRichTextEmpty } from '@/lib/format';

type T = Awaited<ReturnType<typeof getTranslations>>;

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

/**
 * The full body of a paper: header, resource links, the inline PDF, the
 * abstract and the citation block. Shared by the paper's own page and by the
 * research listing when there is only one paper — no point in a reader
 * clicking through to the single thing already on the list.
 */
export function PaperArticle({
  paper,
  t,
  headingLevel: Heading = 'h1',
}: {
  paper: Paper;
  t: T;
  headingLevel?: 'h1' | 'h2';
}) {
  const pdf = typeof paper.pdf === 'object' && paper.pdf ? paper.pdf : null;

  return (
    <article>
      <header className="border-border border-b pb-8">
        <div className="num text-ink-muted flex flex-wrap items-baseline gap-x-4 text-xs">
          {paper.year ? <span>{paper.year}</span> : null}
          <span>{t(`research.status.${paper.status}`)}</span>
        </div>
        <Heading className="mt-3 text-3xl sm:text-4xl">{paper.title}</Heading>
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
        <section aria-labelledby={`abstract-${paper.id}`} className="mt-10">
          <h2 id={`abstract-${paper.id}`} className="text-xl">
            {t('research.abstractHeading')}
          </h2>
          <div className="mt-3">
            <RichText data={paper.abstract} />
          </div>
        </section>
      ) : null}

      {pdf?.url ? (
        <section aria-labelledby={`full-text-${paper.id}`} className="mt-10">
          <h2 id={`full-text-${paper.id}`} className="text-xl">
            {t('research.fullTextHeading')}
          </h2>
          <div className="border-border bg-surface mt-3 overflow-hidden rounded-3xl border">
            {/* No JS: browsers render their own PDF viewer for a direct PDF
                src, so this costs nothing against the client JS budget. */}
            <iframe
              src={pdf.url}
              title={paper.title}
              className="h-[75vh] min-h-[480px] w-full"
            >
              <p className="p-6">
                {t('research.pdfNotSupported')}{' '}
                <a
                  href={pdf.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-accent-text decoration-accent-mark underline underline-offset-4"
                >
                  {t('research.openPdf')}
                </a>
              </p>
            </iframe>
          </div>
        </section>
      ) : null}

      <CitationBlock apa={paper.citations?.apa} bibtex={paper.citations?.bibtex} />
    </article>
  );
}

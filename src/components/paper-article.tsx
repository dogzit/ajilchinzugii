import { CitationBlock } from '@/components/citation-block';
import { ComparisonChart } from '@/components/comparison-chart';
import { Icon } from '@/components/ui/icon';
import { Link } from '@/components/link';
import { RichText } from '@/components/rich-text';
import type { Paper } from '@/payload-types';
import type { getTranslations } from 'next-intl/server';
import type { Locale } from '@/i18n/routing';
import { formatBytes, isRichTextEmpty } from '@/lib/format';

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
  locale,
  headingLevel: Heading = 'h1',
  policyHref,
}: {
  paper: Paper;
  t: T;
  locale: Locale;
  headingLevel?: 'h1' | 'h2';
  /** Set when the policy submission names this paper as its evidence. */
  policyHref?: string | null;
}) {
  const pdf = typeof paper.pdf === 'object' && paper.pdf ? paper.pdf : null;
  const findings = (paper.findings ?? []).filter(
    (finding) => finding.value && finding.label,
  );
  const comparisonRows = (paper.comparison?.rows ?? []).filter(
    (row) => typeof row.groupA === 'number' && typeof row.groupB === 'number',
  );
  const groupALabel = paper.comparison?.groupALabel;
  const groupBLabel = paper.comparison?.groupBLabel;

  const hasAbstract = !isRichTextEmpty(paper.abstract);
  const hasComparison = comparisonRows.length > 0 && groupALabel && groupBLabel;
  const hasCitation = Boolean(paper.citations?.apa || paper.citations?.bibtex);

  // Built from the sections that this paper actually has, so the nav never
  // offers a link to an anchor that is not on the page. Below two entries it
  // is not a table of contents, it is clutter, so it does not render.
  const contents = [
    hasAbstract ? { id: `abstract-${paper.id}`, label: t('research.abstractHeading') } : null,
    findings.length > 0
      ? { id: `findings-${paper.id}`, label: t('research.findingsHeading') }
      : null,
    // The generic label, not the chart's own title: a title that describes
    // the measure in full is right above the chart and far too long for a
    // row of jump links.
    hasComparison
      ? { id: `comparison-${paper.id}`, label: t('research.comparisonHeading') }
      : null,
    pdf?.url ? { id: `full-text-${paper.id}`, label: t('research.fullTextHeading') } : null,
    hasCitation ? { id: 'citation', label: t('research.citationHeading') } : null,
  ].filter((entry): entry is { id: string; label: string } => Boolean(entry));

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
            <ResourceLink
              href={pdf.url}
              // The size is on the button, not in a tooltip: a reader on a
              // phone decides whether to spend the data before tapping.
              label={
                pdf.filesize
                  ? `${t('research.pdf')} · ${formatBytes(pdf.filesize, locale)}`
                  : t('research.pdf')
              }
              download
            />
          ) : null}
          {paper.codeUrl ? (
            <ResourceLink href={paper.codeUrl} label={t('research.code')} />
          ) : null}
          {paper.dataUrl ? (
            <ResourceLink href={paper.dataUrl} label={t('research.data')} />
          ) : null}
        </div>
      ) : null}

      {contents.length > 2 ? (
        <nav aria-labelledby={`contents-${paper.id}`} className="mt-8">
          <h2
            id={`contents-${paper.id}`}
            className="num text-ink-muted text-xs tracking-widest uppercase"
          >
            {t('policy.tocHeading')}
          </h2>
          <ol className="mt-3 flex flex-wrap gap-x-2 gap-y-2">
            {contents.map((entry, index) => (
              <li key={entry.id} className="flex items-center gap-2">
                {index > 0 ? (
                  <span aria-hidden="true" className="text-border-strong">
                    ·
                  </span>
                ) : null}
                <a
                  href={`#${entry.id}`}
                  className="text-accent-text decoration-accent-mark hover:text-ink text-sm underline underline-offset-4"
                >
                  {entry.label}
                </a>
              </li>
            ))}
          </ol>
        </nav>
      ) : null}

      {hasAbstract ? (
        <section aria-labelledby={`abstract-${paper.id}`} className="mt-10">
          <h2 id={`abstract-${paper.id}`} className="text-xl">
            {t('research.abstractHeading')}
          </h2>
          <div className="mt-3">
            <RichText data={paper.abstract} />
          </div>
        </section>
      ) : null}

      {findings.length > 0 ? (
        <section aria-labelledby={`findings-${paper.id}`} className="mt-12">
          <h2 id={`findings-${paper.id}`} className="text-xl">
            {t('research.findingsHeading')}
          </h2>
          <p className="text-ink-muted mt-2 max-w-[65ch] text-sm">
            {t('research.findingsNote')}
          </p>

          {/* A definition list, not a grid of cards: each figure is a term
              and the passage it is read from is part of its description, so
              a reader can take any one of them back to the paper. */}
          <dl className="mt-6 grid gap-x-8 gap-y-6 sm:grid-cols-2 lg:grid-cols-3">
            {findings.map((finding) => (
              <div
                key={finding.id ?? finding.value}
                className="border-border bg-surface flex flex-col gap-1.5 rounded-3xl border p-5"
              >
                <dt className="num font-display text-ink text-3xl leading-none">
                  {finding.value}
                </dt>
                <dd className="flex flex-col gap-1.5">
                  <span className="text-ink-soft block text-sm leading-snug">
                    {finding.label}
                  </span>
                  <span className="text-ink-muted block text-xs">{finding.source}</span>
                </dd>
              </div>
            ))}
          </dl>
        </section>
      ) : null}

      {hasComparison ? (
        <section aria-labelledby={`comparison-${paper.id}`} className="mt-12">
          <h2 id={`comparison-${paper.id}`} className="text-xl">
            {paper.comparison?.title ?? t('research.comparisonHeading')}
          </h2>
          <ComparisonChart
            id={`comparison-${paper.id}`}
            rows={comparisonRows.map((row) => ({
              label: row.label,
              groupA: row.groupA,
              groupB: row.groupB,
            }))}
            groupALabel={groupALabel}
            groupBLabel={groupBLabel}
            note={paper.comparison?.note}
            locale={locale}
          />
        </section>
      ) : null}

      {/* The other half of the argument. The policy page already links back
          here for its evidence; without this link a reader who arrives at the
          paper never learns that anything was asked for on the strength of
          it. Rendered only when the submission actually names this paper. */}
      {policyHref ? (
        <aside className="border-accent-mark bg-surface-tint mt-12 rounded-3xl border p-6 sm:p-7">
          <p className="text-ink-soft max-w-[55ch] text-sm leading-relaxed">
            {t('research.policyLead')}
          </p>
          <p className="mt-4">
            <Link
              href={policyHref}
              className="text-accent-text hover:text-ink inline-flex items-center gap-1.5 text-sm font-medium"
            >
              {t('research.policyLink')}
              <Icon name="arrow-right" className="h-4 w-4" />
            </Link>
          </p>
        </aside>
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

/**
 * The words a value was read from, quoted as they stand in the document.
 * Shown beside every extracted value and under every result that came from
 * a document, so the reader can check the tool against their own paper.
 */
export function EvidenceQuote({
  excerpt,
  source,
  className = '',
}: {
  excerpt: string;
  /** "Гэрээнээс" — where the excerpt was taken from. */
  source?: string;
  className?: string;
}) {
  return (
    <figure className={className}>
      <blockquote className="border-accent-mark bg-surface-tint text-ink-soft rounded-e-xl border-s-4 px-4 py-2.5 text-sm leading-relaxed">
        «{excerpt}»
      </blockquote>
      {source ? (
        <figcaption className="text-ink-muted mt-1 text-xs">{source}</figcaption>
      ) : null}
    </figure>
  );
}

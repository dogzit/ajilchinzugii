/**
 * The opening of a band: a small uppercase eyebrow, a serif heading, and an
 * optional sentence under it. The heading carries the id the band is
 * labelled by, so the landmark and the visible title are the same words.
 */
export function SectionHeader({
  id,
  eyebrow,
  title,
  lead,
  className = '',
}: {
  id: string;
  eyebrow?: string;
  title: string;
  lead?: string;
  className?: string;
}) {
  return (
    <div className={`max-w-[46rem] ${className}`}>
      {eyebrow ? (
        <p className="text-ink-muted text-xs font-semibold tracking-[0.16em] uppercase">
          {eyebrow}
        </p>
      ) : null}
      <h2 id={id} className="text-ink mt-3">
        {title}
      </h2>
      {lead ? (
        <p className="text-ink-muted mt-4 text-lg leading-relaxed">{lead}</p>
      ) : null}
    </div>
  );
}

/** The top of every page: an optional eyebrow, the title and a short lead. */
export function PageHeader({
  eyebrow,
  title,
  lead,
}: {
  eyebrow?: string;
  title: string;
  lead?: string | null;
}) {
  return (
    <header className="border-border border-b pb-10">
      {eyebrow ? (
        <p className="text-ink-muted mb-3 text-xs font-semibold tracking-[0.16em] uppercase">
          {eyebrow}
        </p>
      ) : null}
      <h1 className="text-ink">{title}</h1>
      {lead ? (
        <p className="text-ink-muted mt-5 max-w-[60ch] text-lg leading-relaxed">{lead}</p>
      ) : null}
    </header>
  );
}

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
    <header className="border-border border-b pb-8">
      {eyebrow ? (
        <p className="num text-ink-muted mb-3 text-xs tracking-[0.14em] uppercase">
          {eyebrow}
        </p>
      ) : null}
      <h1 className="text-3xl sm:text-4xl">{title}</h1>
      {lead ? <p className="text-ink-soft mt-4 max-w-[65ch] text-lg">{lead}</p> : null}
    </header>
  );
}

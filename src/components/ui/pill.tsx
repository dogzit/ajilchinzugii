/**
 * A small rounded label on the tint — an eyebrow that reads as a chip
 * rather than a heading.
 */
export function Pill({
  className = '',
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={`border-border bg-surface-tint text-ink-muted inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium ${className}`}
    >
      {children}
    </span>
  );
}

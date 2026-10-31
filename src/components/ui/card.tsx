/**
 * A card: cream-white, one hairline border, generous radius. No shadow —
 * shadows are kept for things that genuinely float above the page.
 */
export function Card({
  as: Tag = 'div',
  className = '',
  children,
}: {
  as?: 'div' | 'article' | 'li' | 'section';
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Tag
      className={`border-border bg-surface rounded-3xl border p-6 sm:p-8 ${className}`}
    >
      {children}
    </Tag>
  );
}

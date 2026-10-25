import Link from 'next/link';

/** A quiet card: a heading, one line, and the whole card is the link. */
export function CardLink({
  href,
  title,
  description,
}: {
  href: string;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="group border-border hover:border-accent-mark flex flex-col gap-1.5 border-t pt-4 no-underline"
    >
      <span className="font-display text-ink group-hover:decoration-accent-mark text-base group-hover:underline group-hover:underline-offset-4">
        {title}
      </span>
      <span className="text-ink-muted max-w-[45ch] text-sm">{description}</span>
    </Link>
  );
}

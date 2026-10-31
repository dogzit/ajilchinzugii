import Link from 'next/link';
import { Icon } from '@/components/ui/icon';

/**
 * One button, three looks, two sizes.
 *
 * It renders an `<a>` when it goes somewhere and a `<button>` when it does
 * something — never a div pretending to be either. The honey fill carries a
 * 1px `accent-mark` edge: honey on cream is about 2:1, so without that edge
 * the control would be hard to locate (WCAG 1.4.11).
 */

type Variant = 'primary' | 'secondary' | 'quiet';
type Size = 'md' | 'lg';

const base =
  'inline-flex items-center justify-center gap-2 rounded-full font-medium transition-colors';

const sizes: Record<Size, string> = {
  // 44px and 52px: a comfortable target on a phone, and a CTA that leads.
  md: 'min-h-11 px-5 text-sm',
  lg: 'min-h-13 px-7 text-base',
};

const variants: Record<Variant, string> = {
  primary: 'bg-accent text-accent-ink border border-accent-mark hover:bg-accent-mark',
  secondary: 'border border-border-strong text-ink hover:bg-surface-tint',
  quiet: 'text-accent-text hover:text-ink underline underline-offset-4',
};

type Common = {
  variant?: Variant;
  size?: Size;
  className?: string;
  children: React.ReactNode;
  /** Draws an arrow after the label, for links that lead onward. */
  trailingArrow?: boolean;
};

export function ButtonLink({
  href,
  external,
  variant = 'primary',
  size = 'md',
  className = '',
  trailingArrow,
  children,
}: Common & { href: string; external?: boolean }) {
  const classes = `${base} ${sizes[size]} ${variants[variant]} ${className}`;
  const body = (
    <>
      {children}
      {trailingArrow ? <Icon name="arrow-right" className="h-4 w-4" /> : null}
    </>
  );

  if (external) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={classes}>
        {body}
      </a>
    );
  }

  return (
    <Link href={href} className={classes}>
      {body}
    </Link>
  );
}

export function Button({
  variant = 'primary',
  size = 'md',
  className = '',
  trailingArrow,
  children,
  // Without this a button inside a form submits it. The site has no forms
  // today, and this is how it stays true if one is ever added.
  type = 'button',
  ...rest
}: Common & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type={type}
      {...rest}
      className={`${base} ${sizes[size]} ${variants[variant]} ${className}`}
    >
      {children}
      {trailingArrow ? <Icon name="arrow-right" className="h-4 w-4" /> : null}
    </button>
  );
}

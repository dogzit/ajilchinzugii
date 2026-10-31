import { Icon } from '@/components/ui/icon';
import Link from 'next/link';

/**
 * A quote, when there is one to publish.
 *
 * Nothing here is invented. The quote and the caption are marked placeholders
 * until the organisation supplies words given with recorded consent, and the
 * caption deliberately avoids the age-and-province pairing that can identify
 * a young person in a small community.
 */
export function Story({
  eyebrow,
  heading,
  quote,
  caption,
  linkLabel,
  href,
  imageNote,
}: {
  eyebrow: string;
  heading: string;
  quote: string;
  caption: string;
  linkLabel: string;
  href: string;
  imageNote: string;
}) {
  return (
    <section aria-labelledby="story" className="shell band">
      <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
        <div className="border-border bg-surface-tint relative aspect-[5/4] overflow-hidden rounded-3xl border">
          <p className="text-ink-muted absolute inset-x-0 bottom-0 p-6 text-xs">
            {imageNote}
          </p>
        </div>

        <div>
          <p className="text-ink-muted text-xs font-semibold tracking-[0.16em] uppercase">
            {eyebrow}
          </p>
          <h2 id="story" className="sr-only">
            {heading}
          </h2>

          <figure className="mt-6">
            <blockquote className="font-display text-ink text-2xl leading-snug sm:text-3xl">
              {quote}
            </blockquote>
            <figcaption className="text-ink-muted mt-6 text-sm">{caption}</figcaption>
          </figure>

          <p className="mt-8">
            <Link
              href={href}
              className="text-accent-text hover:text-ink inline-flex items-center gap-1.5 text-sm font-medium"
            >
              {linkLabel}
              <Icon name="arrow-right" className="h-4 w-4" />
            </Link>
          </p>
        </div>
      </div>
    </section>
  );
}

import Link from 'next/link';
import { Icon } from '@/components/ui/icon';
import { IconTile } from '@/components/ui/icon-tile';
import { SectionHeader } from '@/components/ui/section-header';
import type { IconName } from '@/components/ui/icon';

/**
 * Three cards, each the whole target.
 *
 * The link spans the card through a stretched pseudo-element, so a click
 * anywhere works while the accessible name stays the one descriptive phrase
 * — "Read about our methodology", never "Read more", which tells a screen
 * reader running through a link list nothing at all.
 */
export function WhatWeDo({
  eyebrow,
  heading,
  lead,
  items,
}: {
  eyebrow: string;
  heading: string;
  lead: string;
  items: {
    key: string;
    href: string;
    icon: IconName;
    title: string;
    body: string;
    linkLabel: string;
  }[];
}) {
  return (
    <section aria-labelledby="what-we-do" className="shell band">
      <SectionHeader id="what-we-do" eyebrow={eyebrow} title={heading} lead={lead} />

      <ul className="mt-12 grid gap-6 md:grid-cols-3">
        {items.map((item) => (
          <li
            key={item.key}
            className="border-border bg-surface hover:border-border-strong relative flex flex-col rounded-3xl border p-7 transition-colors"
          >
            <IconTile name={item.icon} />
            <h3 className="text-ink mt-5">{item.title}</h3>
            <p className="text-ink-muted mt-3 flex-1 leading-relaxed">{item.body}</p>

            <Link
              href={item.href}
              className="text-accent-text hover:text-ink mt-6 inline-flex items-center gap-1.5 text-sm font-medium after:absolute after:inset-0 after:content-['']"
            >
              {item.linkLabel}
              <Icon name="arrow-right" className="h-4 w-4" />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

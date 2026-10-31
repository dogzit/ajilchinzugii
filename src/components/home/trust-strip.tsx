import { IconTile } from '@/components/ui/icon-tile';
import type { IconName } from '@/components/ui/icon';

/**
 * Three promises, stated once, under the hero — the questions a sceptical
 * reader asks before they will look at a single figure.
 */
export function TrustStrip({
  heading,
  items,
}: {
  heading: string;
  items: { icon: IconName; title: string; body: string }[];
}) {
  return (
    <section aria-labelledby="trust" className="border-border bg-surface border-y">
      <div className="shell band">
        <h2 id="trust" className="sr-only">
          {heading}
        </h2>
        <ul className="grid gap-10 md:grid-cols-3 md:gap-8">
          {items.map((item) => (
            <li key={item.title}>
              <IconTile name={item.icon} />
              <h3 className="text-ink mt-5 font-sans text-base font-semibold">
                {item.title}
              </h3>
              <p className="text-ink-muted mt-2 max-w-[32ch] leading-relaxed">
                {item.body}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

import { Icon } from '@/components/ui/icon';
import { Link } from '@/components/link';

/**
 * What the research found, on the front page.
 *
 * This band used to hold a young worker's quote and stood empty, because a
 * quote from a teenager cannot be written by anyone but the teenager, and
 * publishing one without recorded consent is out of the question (CLAUDE.md
 * rule 4). So it carries the other thing the organisation can put its name
 * to: the findings of its own published paper, in the paper's own words,
 * each one naming the passage it is read from.
 *
 * These are national survey estimates from a published paper, not the
 * organisation's impact figures — those come only from the sheet pipeline and
 * are suppressed below five cases. The heading and the source line under
 * every figure keep the two apart.
 *
 * With no findings to show, the band does not render. An empty quote frame is
 * worse than no frame.
 */

export type EvidenceFinding = {
  value: string;
  label: string;
  source: string;
};

export function Evidence({
  eyebrow,
  heading,
  quote,
  caption,
  findings,
  linkLabel,
  href,
}: {
  eyebrow: string;
  heading: string;
  quote: string;
  caption: string;
  findings: EvidenceFinding[];
  linkLabel: string;
  href: string;
}) {
  if (findings.length === 0) return null;

  return (
    <section aria-labelledby="evidence" className="shell band">
      <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
        <dl className="flex flex-col gap-4">
          {findings.map((finding) => (
            <div
              key={finding.value + finding.label}
              className="border-border bg-surface flex items-baseline gap-5 rounded-3xl border p-5 sm:p-6"
            >
              <dt className="num font-display text-ink shrink-0 text-3xl leading-none sm:text-4xl">
                {finding.value}
              </dt>
              <dd className="flex flex-col gap-1">
                <span className="text-ink-soft block text-sm leading-snug">
                  {finding.label}
                </span>
                <span className="text-ink-muted block text-xs">{finding.source}</span>
              </dd>
            </div>
          ))}
        </dl>

        <div>
          <p className="text-ink-muted text-xs font-semibold tracking-[0.16em] uppercase">
            {eyebrow}
          </p>
          <h2 id="evidence" className="sr-only">
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

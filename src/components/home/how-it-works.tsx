import { SectionHeader } from '@/components/ui/section-header';

/**
 * The two tools in three steps, straight under the hero's buttons: what
 * the reader does, what the site does, and what they leave with. Numbered,
 * because the order is the point.
 */
export function HowItWorks({
  eyebrow,
  heading,
  lead,
  steps,
}: {
  eyebrow: string;
  heading: string;
  lead: string;
  steps: { title: string; body: string }[];
}) {
  return (
    <section aria-labelledby="how-it-works" className="shell pb-16 md:pb-24">
      <SectionHeader id="how-it-works" eyebrow={eyebrow} title={heading} lead={lead} />
      <ol className="mt-10 grid gap-5 md:grid-cols-3">
        {steps.map((step, index) => (
          <li key={step.title} className="border-border bg-surface flex gap-4 rounded-3xl border p-6">
            <span
              aria-hidden="true"
              className="num bg-surface-tint border-accent-mark text-ink inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border font-semibold"
            >
              {index + 1}
            </span>
            <div>
              <h3 className="text-ink">{step.title}</h3>
              <p className="text-ink-muted mt-2 leading-relaxed">{step.body}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

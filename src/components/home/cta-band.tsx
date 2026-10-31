import { ButtonLink } from '@/components/ui/button';

/** The closing invitation, on a dark panel so it reads as the end of the page. */
export function CtaBand({
  heading,
  body,
  primary,
  secondary,
}: {
  heading: string;
  body: string;
  primary: { label: string; href: string };
  secondary: { label: string; href: string };
}) {
  return (
    <section aria-labelledby="cta" className="shell pb-16 md:pb-24">
      <div className="bg-panel rounded-[2rem] px-7 py-14 sm:px-12 sm:py-20">
        <h2 id="cta" className="text-panel-ink max-w-[18ch]">
          {heading}
        </h2>
        <p className="text-panel-ink/80 mt-5 max-w-[48ch] text-lg leading-relaxed">
          {body}
        </p>
        <div className="mt-9 flex flex-wrap gap-3">
          <ButtonLink href={primary.href} size="lg">
            {primary.label}
          </ButtonLink>
          <ButtonLink
            href={secondary.href}
            size="lg"
            variant="secondary"
            className="text-panel-ink border-panel-ink/40 hover:bg-panel-ink/10"
          >
            {secondary.label}
          </ButtonLink>
        </div>
      </div>
    </section>
  );
}

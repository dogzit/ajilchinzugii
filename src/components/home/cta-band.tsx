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
        {/* Equal weight, as in the hero: the two tools. */}
        <div className="mt-9 grid max-w-[36rem] gap-3 sm:grid-cols-2">
          <ButtonLink href={primary.href} size="lg" className="w-full">
            {primary.label}
          </ButtonLink>
          <ButtonLink href={secondary.href} size="lg" className="w-full">
            {secondary.label}
          </ButtonLink>
        </div>
      </div>
    </section>
  );
}

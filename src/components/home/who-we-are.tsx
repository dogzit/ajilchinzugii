/**
 * One paragraph, stated plainly, under a small label. It sits between the
 * hero and the work itself because a reader who has just arrived needs to
 * know who is speaking before they are shown figures.
 */
export function WhoWeAre({ eyebrow, body }: { eyebrow: string; body: string }) {
  return (
    <section aria-labelledby="who-we-are" className="border-border border-b">
      <div className="mx-auto grid max-w-6xl gap-x-12 gap-y-4 px-4 py-14 sm:px-6 sm:py-20 md:grid-cols-[14rem_1fr]">
        <h2
          id="who-we-are"
          className="text-ink-muted font-sans text-xs tracking-[0.18em] uppercase"
        >
          {eyebrow}
        </h2>
        <p className="text-ink max-w-[62ch] text-lg leading-relaxed sm:text-xl">{body}</p>
      </div>
    </section>
  );
}

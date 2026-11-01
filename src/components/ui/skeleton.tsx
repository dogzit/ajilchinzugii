/**
 * The shape a page holds while its content is on its way.
 *
 * Most clicks on this site are answered from a prerendered page the router
 * has already prefetched, and those arrive with no wait at all. The wait is
 * real in the cases that are easy to forget: a first visit on a slow
 * connection, a page whose prefetch has not landed yet, the request that
 * finds a revalidated page cold, and the impact page when the sheet is being
 * read again. A reader who clicks into silence does not know whether the site
 * heard them.
 *
 * So each page that is answered from data brings a `loading.tsx` with its own
 * outline: the heading where the heading will be, the cards where the cards
 * will be. The content replaces it in place, so nothing jumps.
 *
 * It is a drawing, not information. The whole screen is `aria-hidden`, and a
 * reader using a screen reader is told about the page by Next's own route
 * announcer once it has actually arrived — an outline has nothing to say.
 *
 * Two things are deliberate and worth keeping:
 *
 * - The fade is late (`.skeleton-screen` in globals.css). An answer that
 *   comes back quickly lands before the outline is ever painted, so a fast
 *   page is not spoiled by a flash of grey — and because the bars are still
 *   transparent when the real content takes their place, a prerendered page
 *   measures the same CLS it did before (0 on both skeleton routes).
 * - There is no `loading.tsx` at the `[locale]` level, and there must not be.
 *   It would wrap `[...rest]` as well, and a route that starts streaming can
 *   no longer answer 404 — a page that does not exist would reply 200. The
 *   home page therefore has no outline; it is prerendered and needs none.
 *
 * No client JavaScript is involved in any of it.
 */

/** One grey bar. Width, height and radius come from the caller. */
export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`skeleton ${className}`} />;
}

/** A paragraph's worth of bars; the last one stops short, as a line does. */
export function SkeletonLines({
  count = 3,
  className = '',
}: {
  count?: number;
  className?: string;
}) {
  return (
    <div className={`flex flex-col gap-2.5 ${className}`}>
      {Array.from({ length: count }, (_, index) => (
        <Skeleton
          key={index}
          className={`h-4 ${index === count - 1 ? 'w-1/2' : 'w-full'}`}
        />
      ))}
    </div>
  );
}

/** The outline of <PageHeader />: a title, a short lead, the hairline under. */
export function SkeletonPageHeader() {
  return (
    <div className="border-border border-b pb-10">
      <Skeleton className="h-9 w-3/4 max-w-[28rem] sm:h-12" />
      <div className="mt-6 max-w-[60ch]">
        <SkeletonLines count={2} />
      </div>
    </div>
  );
}

/**
 * The frame every skeleton sits in: the page's own width and rhythm, so the
 * outline stands exactly where the content will.
 */
export function SkeletonScreen({
  children,
  className = 'shell max-w-[62rem] py-14 md:py-20',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      aria-hidden="true"
      data-testid="page-skeleton"
      className={`skeleton-screen ${className}`}
    >
      {children}
    </div>
  );
}

/**
 * Prose pages — about, methodology, policy — share one outline: a header and
 * a few sections of running text.
 */
export function SkeletonArticlePage() {
  return (
    <SkeletonScreen>
      <SkeletonPageHeader />
      {[0, 1, 2].map((section) => (
        <div key={section} className="mt-14">
          <Skeleton className="h-6 w-56" />
          <SkeletonLines count={4} className="mt-5 max-w-[65ch]" />
        </div>
      ))}
    </SkeletonScreen>
  );
}

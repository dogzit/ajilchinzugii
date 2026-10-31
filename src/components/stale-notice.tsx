/**
 * The sheet could not be read, so the figures on the page are the last good
 * snapshot — real, just older.
 *
 * This is not shown to the public. A visitor cannot act on it, and a warning
 * about our own plumbing on a page whose whole argument is trustworthiness
 * reads as a fault in the figures rather than in the pipe. The failure is
 * already recorded server-side by `logFailure` in src/lib/impact, which is
 * where someone can actually do something about it, and the page still says
 * plainly when the figures were last updated.
 *
 * It does render in development, so the state is visible while working.
 */
export function StaleNotice() {
  if (process.env.NODE_ENV === 'production') return null;

  return (
    <p
      role="status"
      className="border-accent-mark bg-accent-surface text-ink max-w-[65ch] rounded-2xl border px-4 py-3 text-sm"
    >
      Dev only: the live sheet could not be read, so these are the last saved figures.
      Visitors do not see this.
    </p>
  );
}

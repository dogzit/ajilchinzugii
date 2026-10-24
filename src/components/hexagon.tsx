/**
 * The one motif on the site: a honeycomb cell, used as the marker on a figure
 * and nowhere else. The organisation is called "worker bee"; a single quiet
 * reference earns its place, a swarm of them would not.
 */
export function Hexagon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
      className={className}
      width="12"
      height="12"
    >
      <path
        d="M12 1.5 21.5 7v10L12 22.5 2.5 17V7z"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * The icon set: stroke drawings, one weight, drawn on a 24-unit grid.
 *
 * Inline rather than a package — eight shapes do not justify a dependency,
 * and these ship with the HTML instead of a second request. Every one is
 * decorative; the text beside it carries the meaning, so they are hidden
 * from assistive technology.
 */

export type IconName =
  | 'shield'
  | 'eye-off'
  | 'check-circle'
  | 'scale'
  | 'compass'
  | 'document'
  | 'gavel'
  | 'arrow-right'
  | 'menu'
  | 'globe'
  | 'hexagon'
  | 'sun'
  | 'moon'
  | 'auto-theme';

const paths: Record<IconName, React.ReactNode> = {
  shield: <path d="M12 3 5 6v5.5c0 4 2.9 7.6 7 9.5 4.1-1.9 7-5.5 7-9.5V6l-7-3Z" />,
  'eye-off': (
    <>
      <path d="M3 3l18 18" />
      <path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" />
      <path d="M9.4 5.3A9.6 9.6 0 0 1 12 5c5 0 9 4.5 9 7a11 11 0 0 1-2.4 3.5" />
      <path d="M6.3 7.1C4.2 8.5 3 10.6 3 12c0 2.5 4 7 9 7a9.4 9.4 0 0 0 3.6-.7" />
    </>
  ),
  'check-circle': (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="m8.5 12 2.5 2.5 4.5-5" />
    </>
  ),
  scale: (
    <>
      <path d="M12 4v16M7 20h10" />
      <path d="M5 8h14M5 8 3 13h4L5 8ZM19 8l-2 5h4l-2-5Z" />
    </>
  ),
  compass: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="m14.5 9.5-1.7 4.2-4.3 1.8 1.7-4.2 4.3-1.8Z" />
    </>
  ),
  document: (
    <>
      <path d="M6 3.5h7l5 5V20a.5.5 0 0 1-.5.5h-11A.5.5 0 0 1 6 20V4a.5.5 0 0 1 .5-.5Z" />
      <path d="M13 3.5v5h5M9 13h6M9 16.5h4" />
    </>
  ),
  gavel: (
    <>
      <path d="m4 20 7-7M9.5 8.5l6 6M13 5l6 6M11.2 6.8 8.4 9.6M17.2 12.8l-2.8 2.8" />
    </>
  ),
  'arrow-right': <path d="M5 12h13m-5.5-5.5L18 12l-5.5 5.5" />,
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  globe: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M3.5 12h17M12 3.5c2.2 2.4 3.3 5.3 3.3 8.5S14.2 18.1 12 20.5c-2.2-2.4-3.3-5.3-3.3-8.5S9.8 5.9 12 3.5Z" />
    </>
  ),
  hexagon: <path d="M12 2.8 20.2 7v10L12 21.2 3.8 17V7z" />,
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M18.4 5.6 17 7M7 17l-1.4 1.4" />
    </>
  ),
  moon: <path d="M19 14.5A7.5 7.5 0 0 1 9.5 5a7.5 7.5 0 1 0 9.5 9.5Z" />,
  // Half lit, half not: the system decides which.
  'auto-theme': (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 3.5a8.5 8.5 0 0 1 0 17Z" fill="currentColor" stroke="none" />
    </>
  ),
};

export function Icon({
  name,
  className = 'h-5 w-5',
  strokeWidth = 1.6,
}: {
  name: IconName;
  className?: string;
  strokeWidth?: number;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      {paths[name]}
    </svg>
  );
}

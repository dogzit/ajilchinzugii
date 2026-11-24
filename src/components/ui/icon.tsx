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
  | 'auto-theme'
  | 'verdict-red'
  | 'verdict-yellow'
  | 'verdict-green'
  | 'arrow-left'
  | 'phone'
  | 'camera'
  | 'upload'
  | 'clipboard'
  | 'chat'
  | 'lock'
  | 'copy'
  | 'download'
  | 'user-card'
  | 'user'
  | 'trash'
  | 'printer';

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
  // The three verdicts. Each has its own shape, so the result never rests
  // on colour alone: an octagon with "!", a triangle with "?", a tick.
  'verdict-red': (
    <>
      <path d="M8.3 3.5h7.4l4.8 4.8v7.4l-4.8 4.8H8.3l-4.8-4.8V8.3z" />
      <path d="M12 7.5v5.5M12 16.3v.2" />
    </>
  ),
  'verdict-yellow': (
    <>
      <path d="M12 3.8 21 19.5H3z" />
      <path d="M10.3 10.6a1.8 1.8 0 1 1 2.6 1.6c-.6.3-.9.8-.9 1.4M12 16.6v.2" />
    </>
  ),
  'verdict-green': (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="m8.3 12.2 2.5 2.5 4.9-5.2" />
    </>
  ),
  'arrow-left': <path d="M19 12H6m5.5-5.5L6 12l5.5 5.5" />,
  phone: (
    <path d="M6.6 3.5h2.6l1.4 4-1.9 1.3a10.5 10.5 0 0 0 6.5 6.5l1.3-1.9 4 1.4v2.6a1.6 1.6 0 0 1-1.7 1.6A15.6 15.6 0 0 1 5 5.2a1.6 1.6 0 0 1 1.6-1.7Z" />
  ),
  camera: (
    <>
      <path d="M4 8.5A1.5 1.5 0 0 1 5.5 7h2.3l1.5-2h5.4l1.5 2h2.3A1.5 1.5 0 0 1 20 8.5v9a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 17.5z" />
      <circle cx="12" cy="12.8" r="3.3" />
    </>
  ),
  upload: <path d="M12 15.5V4.5m-4.5 4.5L12 4.5 16.5 9M5 15v3.5A1.5 1.5 0 0 0 6.5 20h11a1.5 1.5 0 0 0 1.5-1.5V15" />,
  clipboard: (
    <>
      <path d="M9 4.5H6.5A1.5 1.5 0 0 0 5 6v13.5A1.5 1.5 0 0 0 6.5 21h11a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H15" />
      <path d="M9 3.5h6v2.5H9zM8.5 11h7M8.5 14.5h7M8.5 18h4" />
    </>
  ),
  chat: (
    <path d="M4.5 6A1.5 1.5 0 0 1 6 4.5h12A1.5 1.5 0 0 1 19.5 6v9a1.5 1.5 0 0 1-1.5 1.5H10l-4.5 3.5v-3.5A1.5 1.5 0 0 1 4.5 15z" />
  ),
  lock: (
    <>
      <rect x="5" y="10.5" width="14" height="9.5" rx="1.5" />
      <path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5" />
    </>
  ),
  copy: (
    <>
      <rect x="8.5" y="8.5" width="11" height="11" rx="1.5" />
      <path d="M15.5 8.5V6A1.5 1.5 0 0 0 14 4.5H6A1.5 1.5 0 0 0 4.5 6v8A1.5 1.5 0 0 0 6 15.5h2.5" />
    </>
  ),
  download: <path d="M12 4.5v11m-4.5-4.5 4.5 4.5 4.5-4.5M5 19.5h14" />,
  'user-card': (
    <>
      <rect x="3.5" y="5.5" width="17" height="13" rx="1.5" />
      <circle cx="9" cy="11" r="2" />
      <path d="M6 15.5c.5-1.4 1.6-2 3-2s2.5.6 3 2M14.5 10h3.5M14.5 13h3.5" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8.5" r="3.5" />
      <path d="M5 20c.8-3.6 3.5-5.5 7-5.5s6.2 1.9 7 5.5" />
    </>
  ),
  trash: <path d="M4.5 7h15M9.5 7V4.5h5V7M6.5 7l1 13h9l1-13M10 10.5v6M14 10.5v6" />,
  printer: (
    <>
      <path d="M7 9V4h10v5M7 17H5.5A1.5 1.5 0 0 1 4 15.5v-5A1.5 1.5 0 0 1 5.5 9h13a1.5 1.5 0 0 1 1.5 1.5v5a1.5 1.5 0 0 1-1.5 1.5H17" />
      <path d="M7 14h10v6H7z" />
    </>
  ),
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

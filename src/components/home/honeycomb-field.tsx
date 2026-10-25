/**
 * The hero graphic: a honeycomb drawn in SVG.
 *
 * Deliberately not a photograph. The organisation works with minors, whose
 * photographs may not be published without recorded consent (CLAUDE.md rule
 * 4), and a stock photograph of a child would be worse than none at all. The
 * cells thin out from left to right, so the headline above keeps the weight.
 *
 * It costs no network request, scales to any width without a second file,
 * and takes its colour from the theme. The cells are drawn evenly; the fade
 * is a CSS mask on the element, which follows the rendered width instead of
 * the viewBox and so survives any crop.
 */

const COLUMNS = 14;
const ROWS = 7;
const RADIUS = 10;

// A pointy-top hexagon: width is √3·r, the vertical step is 1.5·r, and every
// other column drops by half a step so the cells interlock.
const WIDTH_STEP = Math.sqrt(3) * RADIUS;
const HEIGHT_STEP = 1.5 * RADIUS;

const cell = (cx: number, cy: number) =>
  Array.from({ length: 6 }, (_, i) => {
    const angle = (Math.PI / 180) * (60 * i - 30);
    return `${(cx + RADIUS * Math.cos(angle)).toFixed(2)},${(cy + RADIUS * Math.sin(angle)).toFixed(2)}`;
  }).join(' ');

export function HoneycombField({
  className,
  style,
}: {
  className?: string;
  style?: React.CSSProperties;
}) {
  const cells: string[] = [];

  for (let column = 0; column < COLUMNS; column += 1) {
    for (let row = 0; row < ROWS; row += 1) {
      const cx = WIDTH_STEP * (column + 0.5) + (row % 2 ? WIDTH_STEP / 2 : 0);
      const cy = HEIGHT_STEP * (row + 0.5) + RADIUS * 0.25;
      cells.push(cell(cx, cy));
    }
  }

  const width = WIDTH_STEP * (COLUMNS + 0.5);
  const height = HEIGHT_STEP * ROWS + RADIUS * 0.5;

  return (
    <svg
      viewBox={`0 0 ${width.toFixed(2)} ${height.toFixed(2)}`}
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
      focusable="false"
      className={className}
      style={style}
    >
      <g fill="none" stroke="currentColor" strokeWidth="1.1">
        {cells.map((points, index) => (
          <polygon key={index} points={points} />
        ))}
      </g>
    </svg>
  );
}

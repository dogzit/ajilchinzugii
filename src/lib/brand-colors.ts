/**
 * The two page colours, for the places CSS cannot reach.
 *
 * A browser paints things the stylesheet has no say over — the address bar
 * on a phone, the window behind an installed app, the splash screen — and
 * asks for them as plain values in a meta tag and in the web manifest. These
 * are the only two colours written outside src/app/globals.css, and
 * tests/unit/tokens.test.ts holds them to the `--bg` of each palette, so the
 * stylesheet stays the one place a colour is decided.
 */
export const pageBackground = {
  light: '#fbf7ef',
  dark: '#1e1712',
} as const;

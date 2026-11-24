---
name: Ajilchin Zugii
description: Labour-rights tools for working teens in Mongolia. Warm, clean, trustworthy.
colors:
  background: "#fbf7ef"
  surface: "#fffdf8"
  surface-tint: "#f3e7d3"
  border: "#eadfcc"
  border-strong: "#7d6b54"
  ink: "#2b2118"
  ink-soft: "#3f3124"
  ink-muted: "#5c4a38"
  primary: "#e8a33d"
  on-primary: "#2b2118"
  accent-text: "#8a520a"
  accent-mark: "#a8761a"
  panel: "#2b2118"
  on-panel: "#fbf7ef"
  verdict-red: "#b3261e"
  verdict-amber: "#a35f00"
  verdict-green: "#2e7d32"
typography:
  headline:
    fontFamily: Literata
    fontWeight: 600
  body:
    fontFamily: Onest
    fontWeight: 400
  label:
    fontFamily: Onest
    fontWeight: 500
rounded:
  control: 9999px
  card: 24px
  panel: 32px
spacing:
  gutter-mobile: 16px
  gutter-desktop: 24px
  band-mobile: 64px
  band-desktop: 104px
  max-width: 1200px
---

# Ajilchin Zugii — design system

An organisation you would hand a case to: not a charity campaign, not a
statistics office. Readers are working teens aged 13–24 on a phone, and the
skeptical adults who check the organisation's work (admissions officers,
funders, ministry staff, researchers).

## Brand

- **Ground:** cream (`background`), with white-cream cards (`surface`) and a
  warm tint (`surface-tint`) for bands that need separating.
- **Text:** warm brown (`ink`), never black. Secondary text `ink-muted`.
- **One accent:** honey (`primary`) — the bee. Honey is a fill behind dark
  text (`on-primary`), never cream text on honey. Honey-coloured words and
  links use `accent-text`. Rules, edges and marks use `accent-mark`.
- **Motif:** the bee and the hexagon. Faint hexagon outlines may fill an
  empty picture panel. No stock photos, no photos of children, no emoji, no
  gradients.
- **Dark theme:** a warm brown ground (`#1e1712`), never near-black.

## Type

- Headings: **Literata 600**, fluid sizes, tight leading, balanced wrapping.
- Everything else: **Onest** 400/500/600.
- Every figure, date and score uses tabular numerals.
- Mongolian Cyrillic first; long Mongolian words must never force sideways
  scrolling at 360 px.

## Shapes and depth

- Controls are fully rounded pills, at least 44 px tall; a primary call to
  action is 52 px.
- Cards: 24 px radius, 1 px `border`, no shadow. Shadows only on things that
  float (a menu, a floating figure).
- Section bands: 64 px vertical padding on mobile, 104 px on desktop; one
  page width of 1200 px with a 16 px gutter on mobile.

## Verdicts and the score

The raters give a result per rule — red, yellow or green — and a score from
1 to 100. Colour is never the only signal: the verdict word, an icon and the
number are always shown together.

- **Red** (`verdict-red`): breaks the law, act now. Icon: octagon with "!".
- **Yellow/amber** (`verdict-amber`): unknown or needs checking. Icon:
  triangle with "?".
- **Green** (`verdict-green`): meets the rule. Icon: circle with a tick.
- **Score gauge:** a semicircular arc from red through amber to green, the
  number large in the centre in `ink` (not in the verdict colour), the
  verdict word under it.
- Results are listed red first, then yellow, then green. Each item: verdict
  badge, rule title, the explanation, the law article, and — for documents —
  the quoted excerpt in a left-ruled quote block.

## Components

Button (primary honey pill / secondary outlined pill / quiet text link),
Card, SectionHeader (small uppercase eyebrow + serif heading + lead), Pill
(small chip), IconTile (rounded honey tile with one stroke icon), StatCard,
ScoreGauge, VerdictBadge, Stepper (progress through questions: "3 / 15" with
a thin honey bar), FileDrop (dashed rounded area: pick a photo or a file),
EvidenceQuote.

## Accessibility

WCAG 2.1 AA: text 4.5:1, UI marks 3:1, visible focus ring in `accent-text`,
skip link, one `h1` per page, every chart with a data table, reduced motion
respected, full keyboard use.

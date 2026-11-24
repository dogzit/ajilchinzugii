# Stitch reference screens

Generated 2026-11-24 in the Stitch project "Ajilchin Zugii — rater redesign"
(`projects/2136736912542058392`, design system `assets/ef74ff7c33264e7f8967155590e5397d`,
created from [`../DESIGN.md`](../DESIGN.md)). Model: Gemini 3.8 Flash.

Each screen has a mobile (390 px) and a desktop (1280 px) version, as HTML and
as a screenshot. The briefs, with their Mongolian copy, are in
[`briefs.json`](briefs.json) (`_common` is prepended to every brief).

| Screen | Files |
| --- | --- |
| Home, new hero with both rater buttons | `home-*` |
| Contract rater start (three inputs) | `rater-start-*` |
| One questionnaire step | `question-*` |
| Field confirmation with evidence | `confirm-*` |
| Results (gauge, red → yellow → green) | `results-*` |
| Help and escalation intake | `help-*` |
| CV rater start with profile | `cv-start-*` |
| CV results | `cv-results-*` |
| Sign-in, sign-up | `sign-in-*`, `sign-up-*` |
| Account dashboard | `account-*` |
| Impact, restyled | `impact-*` |

**Reference only. None of this HTML ships.** The screens are re-implemented in
this stack with the tokens in `src/app/globals.css` and the pieces in
`src/components/ui/`.

## What was taken

- Results: the gauge on its own card at the top, the draft notice right
  under it, an urgent 108 callout before the list, result cards with the
  verdict pill first, a serif title, the explanation, the article in honey
  text and a left-ruled evidence quote; passed rules folded into one
  "Хангасан (n)" group; the employer message and the template as two action
  cards; the help request on the dark panel.
- Rater start: three full-width choice cards, each with a honey icon tile,
  title, one line and a chevron; a lock note and the draft notice below.
- Home: the two rater buttons equally weighted, full width and stacked on a
  phone, side by side on desktop; a three-step "how it works" row.
- Question: stepper with "n / 15" and a thin honey bar, Back as a quiet
  text button, one large primary button at the bottom.

## What was ignored (Stitch added it; the briefs did not ask for it)

- A bottom tab bar on the phone home screen, with invented sections.
- A "Хөдөлмөрийн хууль 2021" card in the hero.
- Stitch substituted Source Sans 3 for Onest in its own rendering; the site
  keeps Onest and Literata through `next/font`.
- Pink fills behind red items: the site keeps cream cards and puts the
  verdict colour only on the badge's edge and icon (colour is a 3:1 mark,
  the words carry the meaning).

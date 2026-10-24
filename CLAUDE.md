# CLAUDE.md — Ажилчин Зөгий (Ajilchin Zögii)

Impact and methodology website for a working-teens NGO that protects the labour
rights of working children and teens (collective bargaining, negotiation,
policy work). Every published number must be checkable against its evidence.

Readers: university admissions officers, funders, staff of the Ministry of
Family, Labour and Social Protection, and researchers. Write for careful,
skeptical readers: precise, sourced, no marketing fluff.

## Non-negotiable rules (read before every task)

1. **No figure is typed into a page.** Impact numbers come only from the
   Google Sheet pipeline (`src/lib/impact/`). Never hardcode a statistic in a
   component, CMS seed or translation file.
2. **Small-cell suppression.** Any figure based on fewer than 5 cases is never
   rendered as a number. Render the localized label "5-аас цөөн / Fewer than 5"
   instead. Suppression happens on the server, before data reaches any
   component. Totals only — never per-case rows.
3. **Case-level data never leaves the Google Sheet.** The site reads only the
   aggregate `Totals` and `Monthly` tabs. Do not add code that reads any other
   tab, and do not store raw rows in the database, logs or cache.
4. **No minors' personal data anywhere**: no names, photos, schools or
   workplaces of minors in content, alt text, file names, image EXIF, URLs or
   seed data. Member photos require a recorded written consent (teen + parent);
   the Media collection enforces this.
5. **Publish only.** No forms that collect data. Contact is a plain email
   address shown as selectable text.
6. **Bilingual.** Mongolian (`mn`, default) and English (`en`). Every page has a
   language switch that keeps the reader on the same page. No UI string is
   hardcoded; all go through `messages/{mn,en}.json` or localized CMS fields.
7. **Accessibility: WCAG 2.1 AA.** Contrast ≥ 4.5:1 for text, required alt text
   (both languages), full keyboard navigation, visible focus, skip link,
   semantic landmarks, `prefers-reduced-motion` respected. Every chart has a
   data table alternative.
8. **Performance budget.** Mobile-first. Each page loads in < 2 s on 4G:
   LCP < 2.5 s, CLS < 0.1, INP < 200 ms, ≤ 100 KB client JS per route
   (gzipped). Prefer Server Components; add `"use client"` only when needed.
9. **Portable domain.** Never hardcode a domain. Use `NEXT_PUBLIC_SITE_URL`
   everywhere (metadata, sitemap, JSON-LD, canonical, OG). Moving to a new
   domain must be an env change + 301 redirect, nothing else.
10. **Accounts belong to the client.** Do not create or reference personal
    accounts of the developer in config. All service credentials come from env.

## Stack

| Concern       | Choice                                                                                          |
| ------------- | ----------------------------------------------------------------------------------------------- |
| Framework     | Next.js (App Router, latest stable), TypeScript strict                                          |
| Styling       | Tailwind CSS with design tokens as CSS variables                                                |
| i18n          | `next-intl`, routes `/mn/...` and `/en/...`, `mn` default                                       |
| CMS           | Payload CMS 3 (runs inside the Next.js app, admin at `/admin`)                                  |
| Database      | Neon Postgres via `@payloadcms/db-postgres` (pooled URL for app, direct URL for migrations)     |
| Media storage | Cloudflare R2 via `@payloadcms/storage-s3` (S3-compatible). Never store image bytes in Postgres |
| Impact data   | Google Sheets API v4, read-only service account, ISR daily + on-demand revalidation             |
| Charts        | Hand-built accessible SVG (server-rendered) — no heavy chart library                            |
| Analytics     | Plausible (or self-hosted Umami) — no cookies, no banner                                        |
| Hosting       | Vercel (HTTPS automatic)                                                                        |
| Tests         | Vitest (unit), Playwright + @axe-core/playwright (e2e + a11y), Lighthouse CI                    |

## Project layout

```
src/
  app/
    (frontend)/[locale]/            # public site
      page.tsx                      # Home
      impact/page.tsx
      methodology/page.tsx
      research/page.tsx
      research/[slug]/page.tsx
      policy/page.tsx
      about/page.tsx
    (payload)/admin/...             # Payload admin
    api/revalidate/route.ts         # secret-protected on-demand revalidation
    sitemap.ts
    robots.ts
  collections/                      # Payload: Pages, Papers, Team, Partners, Media, Users
  globals/                          # Payload: Site, Methodology, Policy, ImpactSnapshot
  lib/
    impact/                         # sheet client, schema (zod), suppression, snapshot
    seo/                            # metadata helpers, JSON-LD builders
  components/
  i18n/
messages/mn.json, messages/en.json
```

## Impact data contract (Google Sheet)

The client keeps the case log in its own private spreadsheet. A **separate
"public totals" spreadsheet** computes aggregates from it (IMPORTRANGE /
formulas). Only this second spreadsheet is shared with the site's service
account (Viewer). The site reads only these two tabs of it:

`Totals` — one row per headline metric:
| metric_id | label_mn | label_en | value | n_cases | as_of (YYYY-MM-DD) | method_anchor | show_on_home (TRUE/FALSE) |

`Monthly` — one row per month per metric:
| month (YYYY-MM) | metric_id | value | n_cases |

Rules in code:

- Validate with zod; reject the whole fetch if the schema breaks.
- If `n_cases < 5`, replace `value` with `null` + `suppressed: true`.
- On success, save the validated, suppressed result to the `ImpactSnapshot`
  global. On failure, serve the last good snapshot and log the error (no data in
  the log). The page always shows each figure's `as_of` date.
- `method_anchor` links to `/[locale]/methodology#<anchor>`.

## Design direction

Calm, evidentiary, institutional — closer to a statistics office or research
lab than a charity campaign. Honey/amber accent used sparingly (the bee),
deep ink neutrals, generous whitespace, tabular numerals for every figure.
Fonts with full Cyrillic support (e.g. Unbounded for display headings only,
IBM Plex Sans for body, IBM Plex Mono for data/citations) via `next/font`.
No stock photos of children. Light and dark themes.

## Working agreements

- Work in the phase given in the prompt; do not start the next phase.
- Before coding, state a short plan; after coding, run `pnpm lint`,
  `pnpm typecheck` and `pnpm test` and fix failures.
- Commit at the end of each phase with a clear message.
- Never commit secrets. Keep `.env.example` up to date with every variable.
- When something in this file conflicts with a request, stop and ask.
- Content and UI copy: Mongolian first, accurate English second. Do not invent
  statistics, names, partners or quotes — use clearly marked placeholders
  (`[ХҮЛЭЭГДЭЖ БУЙ / TBD]`).

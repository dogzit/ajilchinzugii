# Ажилчин Зөгий — вэб / website

Impact and methodology site for a working-teens labour-rights NGO. Mongolian
(`mn`, default) and English (`en`). See `CLAUDE.md` for the non-negotiable
rules (evidence, small-cell suppression, no minors' data, accessibility).

Phase 1 is the scaffold: routing, i18n, design tokens, landmarks and
placeholder pages marked `[ХҮЛЭЭГДЭЖ БУЙ / TBD]`. Phase 2 adds Payload CMS on
Neon Postgres with media in Cloudflare R2, admin at `/admin`. Phase 3 adds the
impact pipeline in `src/lib/impact/` — see
[docs/impact-sheet.md](docs/impact-sheet.md). No figures are rendered yet; the
pages come next.

Editors: see [docs/README-editor.md](docs/README-editor.md) (in Mongolian).

## Getting started

```sh
pnpm install
cp .env.example .env.local   # then fill in the values
pnpm dev                     # http://localhost:3000 -> /mn
```

| Script           | Purpose                                      |
| ---------------- | -------------------------------------------- |
| `pnpm dev`       | Dev server                                   |
| `pnpm build`     | Production build                             |
| `pnpm lint`      | ESLint                                       |
| `pnpm typecheck` | `tsc --noEmit`                               |
| `pnpm test`      | Vitest unit tests (messages, token contrast) |
| `pnpm e2e`       | Playwright (builds and serves the app)       |
| `pnpm format`    | Prettier                                     |

`pnpm e2e` needs the browser once: `pnpm exec playwright install chromium`.

## Conventions

- **No UI string in a component.** Everything goes through
  `messages/mn.json` / `messages/en.json`.
- **No domain in code.** `NEXT_PUBLIC_SITE_URL` only (`src/lib/site.ts`).
- **Design tokens** are CSS variables in `src/app/globals.css`
  (light + `prefers-color-scheme: dark`), wired into Tailwind with
  `@theme inline`. Contrast is asserted in `tests/unit/tokens.test.ts`.
- **Fonts**: Unbounded (display headings only), IBM Plex Sans (body),
  IBM Plex Mono (figures, dates, citations — tabular numerals via `.num`).
- **Figures come only from the sheet.** `src/lib/impact/` is the only path to a
  number: read two ranges, validate with zod, suppress anything under five
  cases, then store the suppressed result. Nothing sums the monthly points —
  that would make a suppressed month recoverable by subtraction.
- **Schema changes go through a migration.** `push` is off, so edit the
  collection, run `pnpm migrate:create`, read the SQL, then `pnpm migrate`.
- **Generated files** — `src/payload-types.ts`, `src/migrations/*` and
  `src/app/(payload)/admin/importMap.js` are regenerated, not hand-edited.
- **SEO lives in `src/lib/seo/`**: `metadata.ts` composes every route's tags
  (CMS SEO group → the page's own title → the Site global), `jsonld.ts` holds
  the structured data typed against schema.org, `urls.ts` builds every address
  from `NEXT_PUBLIC_SITE_URL`.
- **A field still holding `[ХҮЛЭЭГДЭЖ БУЙ / TBD]` counts as empty** in titles,
  share cards and structured data — the marker belongs on the page, not in a
  search result.
- **`NEXT_PUBLIC_*` values are inlined at build time.** Setting
  `NEXT_PUBLIC_GSC_VERIFICATION` or `NEXT_PUBLIC_PLAUSIBLE_DOMAIN` on a running
  server does nothing; they have to be present when `pnpm build` runs (which is
  how Vercel does it).
- **Analytics**: Plausible loads only when a domain is configured, through its
  `file-downloads` and `outbound-links` extensions — a PDF download and a click
  to another site arrive as events without any of our own JavaScript. It sets
  no cookies. The site's only cookie is `NEXT_LOCALE`, which remembers the
  reader's language.
- **`"type": "module"`** is required: Payload's CLI loads its TypeScript
  through tsx, which mis-resolves CommonJS interop in this project otherwise
  (`@next/env` and undici both break).

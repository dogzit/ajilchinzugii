# Ажилчин Зөгий — вэб / website

Impact and methodology site for a working-teens labour-rights NGO. Mongolian
(`mn`, default) and English (`en`). See `CLAUDE.md` for the non-negotiable
rules (evidence, small-cell suppression, no minors' data, accessibility).

Phase 1 is the scaffold: routing, i18n, design tokens, landmarks and
placeholder pages marked `[ХҮЛЭЭГДЭЖ БУЙ / TBD]`. No figures yet.

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

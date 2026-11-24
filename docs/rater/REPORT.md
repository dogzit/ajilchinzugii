# Contract rater and CV rater — build report

Branch `feat/rater`, built from `main` across phases 0–9 of
`docs/prompts/rater-build-prompt.md`. Nothing is pushed, merged or deployed.
Every phase ends in its own commit (`git log main..feat/rater`).

**Read this first:** every rule is a draft. All entries in `rules.yaml`
carry `lawyer_verified: false`, and `cv-rules.yaml` carries
`staff_verified: false`. The build refuses to open the site to search
engines until a lawyer has verified them (`scripts/check-rules-verified.ts`
runs in `prebuild` when indexing is on, and in CI on pushes to `main`).

## What was built

| Area | What exists |
| --- | --- |
| Rules engine | `src/lib/rater/rules.yaml` (M01–M11, G01–G13, Q01, plus the two P1 answer rules Q02 and Q03). It compiles to JSON, is validated by zod, and is evaluated by a pure engine (`engine.ts`, `derive.ts`). The 1–100 score is a pure function of the per-rule results (`score.ts`). The minimum wage changes from 792,000 to 1,000,000 on 2027-01-01. |
| Questionnaire | `/[locale]/contract-check`: 15 questions, one per screen, with progress. Back keeps the answers. Results are ordered red, then yellow, then green, with the article, the explanation word for word, and the evidence. A P1 shows 108 at once. "Talk to Ajilchin Zugii" appears on any red. |
| Actions | Employer message: the LLM is given only the failed rules and the engine's facts; with no key, a template is used instead. Corrected contract template, as a print page and as a PDF with an embedded Cyrillic font. |
| Extraction | One shared pipeline: redact, extract, validate with zod, check the evidence. PDF (unpdf) and DOCX (fflate) text is read on the server in memory. Photos are read in the browser by tesseract.js (`mon`, self-hosted, lazy-loaded), behind an `OcrEngine` interface. A Gemini extractor (JSON output against the schema) and a mock extractor share one `Extractor` interface. Confirmation screen; rate limiting; logging restricted to a fixed vocabulary; eval harness. |
| CV rater | `/[locale]/cv-check`: profile first, then the same pipeline and the same score. Rubric C01–C12 is a draft. Checks that rest on AI judgment are capped at yellow and labelled. |
| Accounts | Optional Clerk accounts. `ClerkProvider` exists only in the `(account)` route group, and the proxy runs Clerk only on its own paths. Sign-up asks the age group first: no account under 13; ages 13–17 need a guardian's consent. Saved ratings and a reusable CV profile are opt-in. Account deletion; Svix-verified webhook; `/[locale]/privacy`. |
| Cases | Intake form; P1/P2/P3 with deadlines; capacity of 20 a week in Asia/Ulaanbaatar time; `caseworker` role with an access log. Opt-in files are encrypted with AES-256-GCM and stored in a private R2 bucket, purged at 90 days or when the case closes. Delete link with an HMAC token carried in the URL fragment. P1 alerts by email and Telegram. Anonymous `rater-stats` counters with no timestamps. Migrations for the Postgres and D1 adapters. |
| Site | Home: the two raters are the primary actions, in the hero and in the closing band. New trust line. Account link in the header. The other pages are restyled to the Stitch design (`design/DESIGN.md`, `design/stitch/`). |

## How each acceptance criterion was verified

All results below come from the final state of the branch, after the
reviewer's fixes.

| Criterion | Command | Result |
| --- | --- | --- |
| Lint | `pnpm lint` | clean |
| Types | `pnpm typecheck` | clean |
| Unit, property, regression | `pnpm test` | 46 files, 878 tests passed |
| 3 pass / 3 fail / 1 unknown per rule | `tests/unit/rater-rules.test.ts` | passes for every rule in `rules.yaml` (the test enumerates the rules) |
| Wage date switch | `rater-rules`, `rater-review` | the same contract rated on 2026-12-31 and on 2027-01-01 gives the expected verdicts; exactly the minimum passes on either date |
| 30+ scenarios | `tests/unit/rater-scenarios.test.ts` | 42 scenarios pass, including all the cases the prompt names (turns 15 on the start date, 29.5 vs 30.5 h, a shift ending 22:30, per-delivery pay, a herding helper paid in kind, a service contract that is really a job) |
| Score invariant; unknown is never green | `tests/unit/rater-properties.test.ts` | holds on thousands of random contracts from a fixed seed: a red verdict always scores under 40, its colour never mixes in green, and an unknown is never green |
| Regression suite on every `rules.yaml` change | `tests/unit/rater-regression.test.ts` + CI | snapshot unchanged |
| Zero false greens on the test set | `rater-review.test.ts` + the scenario and fixture answer keys | every case the reviewer found is a test and passes |
| No figure, threshold or wage in a component | `grep` of `src/components` for wage, hour and time figures; review; `rater-rules-sync.test.ts` keeps the compiled rules equal to `rules.yaml` | none found: thresholds are read from `rules.yaml` only |
| No personal data in logs, URLs, analytics | `tests/unit/no-leaks.test.ts` (canary values), `cases.spec.ts` (URL stays clean), review | passes |
| Nothing stored without opt-in | `cases.test.ts`, `accounts.test.ts` | passes; a minor's file also needs a guardian's consent |
| E2E, desktop and mobile (Pixel 7) | `pnpm e2e` | 174 passed, 2 skipped (Clerk sign-up, which needs keys) |
| E2E list from the prompt | `contract-check`, `contract-document`, `cv-check`, `cases`, `accounts`, `home`, `language-switch` specs | questionnaire to results; paste with mocked LLM; photo with mocked OCR (and the low-confidence route); PDF and DOCX upload; a confirmation edit changes the verdict; red first; score band matches verdict; P1 shows 108; employer message copy; template PDF; CV flow; the language switch keeps the page; keyboard only |
| axe, zero violations | `pnpm test:a11y`; `tests/e2e/rater-a11y.spec.ts` | 47 passed; 16 passed (every rater state, light and dark, desktop and mobile) |
| Lighthouse | `pnpm lhci` | performance 0.91–0.95, accessibility 1, best practices 1, CLS ≤ 0.02, TBT ≤ 10 ms on all seven URLs. SEO fails only `is-crawlable` (see below). |
| Next build | `pnpm build` | passes |
| Workers build | `pnpm build:cf` (Cloudflare credentials hidden) | passes |
| Workers preview | local `wrangler dev --local` on the OpenNext output (see below) | every page 200; `contract-check`, `cv-check` and `contract-document` e2e: 14/14 passed against the Workers runtime |
| Extraction benchmark | `pnpm eval:extraction`; `pnpm eval:extraction --live` | replay 97.1% (target 95%) from mock-reader recordings, which holds the pipeline steady. **Live, `gemini-3.5-flash-lite`, 2026-11-24: 97.1%** on the 10 synthetic contracts, about 4 s each (misses: in-kind pay on the Latin-script herding contract; a date of birth in the Word file). Real anonymised contracts are still needed. |
| Home buttons | `tests/e2e/home.spec.ts` | the two raters are the primary actions, in both languages |
| Independent review | fresh-context subagent | 15 findings, all fixed or recorded; see below |

### Budgets, honestly

- **Client JS.** First-load JS on the public pages is 199.5 KB gzipped, up
  from main's 196.8 KB (+2.7 KB: the account link and the new icons). On
  `/mn/contract-check` it is 214.2 KB. The 100 KB rule cannot be met on this
  stack: Next's App Router alone needs about 177 KB (`docs/audit.md`).
  `bundle-budget.test.ts` enforces what can be enforced: the shared bundle
  stays under its ceiling, Clerk is absent from public pages, the raters add
  under 25 KB, and OCR is absent from the first load (a lazy, user-triggered
  exception, documented in the test).
- **LCP.** Lab LCP under the repo's LHCI profile (simulated slow 4G, 4× CPU)
  is 2.9–3.4 s on every page, main's included (main: /mn/impact 3.2 s). The
  repo's LHCI threshold is 3.4 s, and every page passes it. The spec's
  2.5 s is not met in this lab profile. Almost all of the time is render
  delay waiting on 153 KB of web fonts (Literata and Onest, Cyrillic and
  Latin), which predates this branch. **Deferred:** subsetting the fonts or
  dropping a weight is a design decision, so it is left for the CTO and
  Eba. Field INP and LCP should be read from Plausible/CrUX after launch.
- **Two regressions found and fixed in phase 9:** the error boundary
  imported the whole message catalogue, so the tools' strings shipped on
  every page (+20 KB). They now live in `messages/tools/*.json`. Tailwind
  was scanning the Stitch mock-ups in `design/`, which added about 370
  unused classes to every stylesheet; the stylesheet is now smaller than
  main's.
- **SEO.** Lighthouse fails only `is-crawlable`, on main too. Indexing is
  closed outside production by design (`NEXT_PUBLIC_ALLOW_INDEXING`), and
  the raters are `noindex` on purpose, so their SEO assertion is off.

### Workers preview, and why not `pnpm preview:cf` as written

`wrangler.jsonc` binds D1 with `remote: true`, so `pnpm preview:cf` opens a
remote proxy session to the production D1 even for a local preview. It was
run with the Cloudflare credentials hidden and failed safely at that step.
The local smoke test therefore used the same build with a scratch copy of
the config: the D1 binding made local, the Hyperdrive local connection
string pointed at the local Docker Postgres, `opennextjs-cloudflare
populateCache local`, then `wrangler dev --local`. Nothing remote was
reachable. **For the CTO:** a `preview:cf:local` script, or a wrangler env
without the remote binding, would make this repeatable.

## The independent review

A fresh-context subagent tried to produce false greens, data leaks and
model-made verdicts. It reported 15 findings, 10 of them reproduced with
throwaway tests. All are now fixed, with regression tests in
`tests/unit/rater-review.test.ts`, `extraction.test.ts`, `cv.test.ts` and
`cases.test.ts`:

1. Overtime and night rates written as percentages passed (a "120%"
   overtime rate gave green 100). Rates are now converted to multipliers.
2. Redaction missed common formats: look-alike Latin letters in register
   numbers, spaced or dotted digits, №, landlines, grouped account numbers,
   "[at]" emails. All are now caught.
3. "Extra hours: yes, don't know how many" counted as zero. It is now
   unknown, and a fail when the ordinary hours are already at the limit.
4. Day pay ignored the extra hours. It now spreads the week's pay over all
   hours worked.
5. A clause dropped by the evidence check left M10 green. It now stays as
   "unverified", which turns M10 and G13 yellow.
6. A missing date of birth softened a schedule that is unlawful at any age.
   It now stays red.
7. G07 never checked the 4-hour daily overtime limit. It does now.
8. The evidence check did not tie a value to its quote. A number must now
   appear in its quote, on digit boundaries.
9. Trial pay was compared across units. It is now compared only with
   monthly pay.
10. `job_category` accepted free text, which could reach statistics and case
    rows. It is now restricted to the ids in `rules.yaml`.
11. A minor's file could be stored without guardian consent. That is now
    refused.
12. Saved ratings trusted the verdict and score sent by the browser. They
    must now be self-consistent.
13. CV: model silence on contact details gave red, and over-sharing found
    only by the model gave red. Silence is now unknown; the model-only
    finding is capped at yellow.
14. Exactly the monthly minimum wage failed. Monthly pay is now pro-rated
    against the monthly minimum.
15. Smaller fixes: a "document" with no evidence is rated as a
    questionnaire; G03 is unknown when the employer kind is unknown; zero
    working days counts as unknown.

The categories where it found nothing are logs and errors, the employer
message, case priority, and the score/colour invariant. Its remark that
names are not redacted is open question lawyer 17.

## Assumptions

- **OCR runs in the browser.** tesseract.js 7 with `mon` (tessdata_fast),
  self-hosted under `/ocr`, loaded only when a photo is picked. The server
  receives text, never the image. It sits behind `OcrEngine`, so a cloud
  engine can replace it after the OCR benchmark.
- **The LLM.** Google Gemini over REST (`generateContent`, no SDK), with
  JSON output against the zod-generated schema, through `GEMINI_API_KEY` and
  `GEMINI_MODEL`. The `.env.example` default is `gemini-3.5-flash-lite` (live run: 97.1% on the fixtures, about 4 s a contract); no model
  id is in the code. (Built on Anthropic first; switched to Gemini on
  2026-11-24 at the owner's request.) Temperature is not sent: Gemini 3.6
  Flash and newer ignore it. The evidence check and code-made verdicts carry
  the determinism (ADR §3). **The Gemini API terms bar services likely to be
  used by under-18s** — see open questions lawyer 19 and CTO 5.
- **The CV rubric** is drafted here and marked `staff_verified: false`.
- **The design keeps the brand:** cream ground, warm brown, honey accent,
  bee and hexagon, Literata 600 and Onest. The score colours are tokens for
  both themes.

## Open questions

All are in `docs/rater/open-questions.md`:

- **Lawyer (18).** Every rule's article and threshold. The minor-protection
  edge cases. Consent and privacy texts. Clerk data residency. The G09 break
  on short shifts. The CV rules. Plus these from the review: how to read
  percentage rates, whether an AI-checked green may stand for a red rule,
  pro-rating monthly pay, redacting names, and minors' files without
  guardian consent.
- **Eba (5).** Order A/122 (until it arrives, M08 is yellow for every
  minor). The light-work list. The job categories. The caseworker rota. The
  self-help kit text.
- **CTO (4).** The OCR engine. Rate limits per isolate. Key rotation for
  case files. The LLM provider's terms.

## Environment variables and accounts the NGO must create

Every variable is in `.env.example` with a comment.

| Variable | Needed for | Account to create |
| --- | --- | --- |
| `GEMINI_API_KEY`, `GEMINI_MODEL` | document and CV reading, employer message | a Google Cloud project owned by the NGO, **with billing on** (unpaid keys let Google train on the content), and an API key from AI Studio; see the terms risk in open questions |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `CLERK_WEBHOOK_SIGNING_SECRET` | optional accounts | Clerk production instance, with the `/__clerk` proxy on the site's domain and a webhook to `/api/clerk/webhook` |
| `CASE_FILES_KEY`, `CASE_TOKEN_SECRET` | case file encryption, delete links | none: generate 32 random bytes each, and keep them in a password manager |
| `CASE_FILES_BUCKET` | opt-in case files | a **private** R2 bucket (not the public media bucket) on the existing R2 credentials |
| `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` | P1 alerts (optional; email works without them) | a Telegram bot and the caseworkers' group |
| `RATER_EXTRACTOR`, `RATE_LIMIT_DISABLED`, `RATER_STATS_DISABLED` | tests only | none; never set them in production |

Email for P1 alerts and delete links reuses the site's existing mail
settings (Resend or SMTP). The purge cron reuses `CRON_SECRET`.

## What is mocked

- The extractor in CI and in e2e (`RATER_EXTRACTOR=mock`): a deterministic
  rule-based reader of the synthetic fixtures. The live Gemini path is
  unit-tested against a stubbed HTTP API and was run live on the fixtures
  (see the benchmark row).
- The extraction benchmark replays recordings made with the mock reader.
  Real recordings need a key and real anonymised contracts.
- OCR in e2e. A real tesseract run was checked by hand under the CSP.
- Clerk sign-up e2e is skipped without keys. The no-keys behaviour is
  tested.
- Locally there is no case-file bucket. An in-memory store stands in for
  it in unit tests, and the e2e case flow runs against the local Docker
  Postgres only.

## Before production

1. A lawyer verifies every rule in `rules.yaml` (then sets
   `lawyer_verified`), every CV rule, and every consent and privacy text.
   The gate blocks indexing until then.
2. Real anonymised contracts, an answer key, and fresh recordings from the
   real model. The eval target is 95% field accuracy on pay, hours and
   dates.
3. The OCR benchmark (spec data item 6); keep tesseract or replace it.
4. Resolve the Gemini terms (no services likely used by under-18s; paid tier only, so no training on the content) — or move to a provider whose terms allow this site.
5. A Clerk production instance with the proxy domain.
6. Order A/122 and the light-work list loaded into `rules.yaml`.
7. **CI uses the production `DATABASE_URL` for its browser job.** This
   predates the branch, and it is why stats writes are switched off in the
   Playwright environment and the case e2e runs only against a local
   database. Give CI a throwaway database branch.
8. **Next.js 16.4.3 has a published security advisory.** The tooling
   flagged it on every build. Upgrade Next before deploying. This was not
   done here, to keep the branch's scope.

## Known ceilings

- **Rate limiting** is per isolate on Workers. That is enough against one
  heavy user; for real abuse, move to the Rate Limiting binding
  (`src/lib/rate-limit.ts`).
- **`rater-stats`** counts with a read then a write. Concurrent requests
  can lose a count. That is acceptable for anonymous aggregates; use an
  atomic increment if exact counts matter.
- **OCR** depends on photo quality. Below the confidence threshold the user
  is sent to the questionnaire.

## Pre-existing issues found and fixed

- `seed-demo` failed on the localized team name.
- The demo paper had no findings, so the home page's evidence section was
  missing.

## Screenshots

`docs/rater/screenshots/`: every new and restyled page, and every rater
state, at 390 and 1280 px, light and dark, Mongolian and English. Names
follow `<page>-<lang>-<width>-<scheme>.jpg`; JPEG quality 55, cut at
6,000 px. The Stitch references are in `design/stitch/`.

Compared with the Stitch screens, these were fixed:

- The footer and the About page still said the site collects no personal
  data, which stopped being true with the raters. Both are rewritten in
  both languages, and `docs/HANDOVER.md` is updated.
- The footer's tool links were spaced unlike the other footer links.
- When two fields cited the same line, its quote appeared twice.

These differences were kept on purpose:

- The gauge track is a single colour rather than Stitch's three-colour arc.
  CLAUDE.md allows no gradients, and the verdict word, icon and number carry
  the meaning.
- The header shows the account link only when Clerk keys are set.
- The site's dot logo and icon tile sizes are unchanged.

## Deferred, with reasons

- **LCP under 2.5 s in the lab profile.** This is fonts, and it predates
  the branch (see Budgets).
- **100 KB client JS.** It cannot be met on the App Router (see Budgets).
- **Clerk sign-up e2e** needs keys.
- **Real-model benchmark** needs a key and real contracts.

# Contract rater and CV rater — build plan

Source documents: `docs/spec/contract-rater-build-instructions.pdf` ("the
spec") and `docs/prompts/rater-build-prompt.md` ("the prompt"). Where they
differ, the prompt wins; the differences are listed in the prompt's §2.
Decisions and their reasons: [adr-001-decisions.md](adr-001-decisions.md).
Unresolved points and who decides them: [open-questions.md](open-questions.md).

## Architecture in one picture

```
 questionnaire ─┐
 paste text ────┼─► extraction service (src/lib/extraction) ─► fields ─► rules engine ─► results ─► score
 photo / file ──┘   text → redact → LLM extract → zod →          (zod)    (pure, code)    (worst-of)   (pure)
   (OCR in the       evidence check → confirmation screen                    │
    browser)                                                                ├─► employer message (LLM, failed rules only)
                                                                            ├─► corrected template (code, pdf-lib)
                                                                            ├─► escalation intake → Cases (opt-in)
                                                                            └─► anonymous counters (RaterStats)
```

- **The LLM extracts, code decides** (CLAUDE.md rule 11). The model fills the
  extraction schema and writes two things only: the employer message and the
  `flagged_clauses` list. Every verdict, the score and the escalation
  priority are computed by `src/lib/rater/engine.ts` from `rules.yaml`.
- **Nothing personal is kept by default.** Text and fields live in the
  browser's memory and in the request that rates them. The server keeps only
  anonymous counters. Storage happens only on an explicit opt-in (case
  record, member account).
- **Both runtimes, both adapters.** Everything is Web-standard (fetch,
  WebCrypto, `Uint8Array`); no native binaries; no `fs` at request time.
  Rules are compiled from YAML to JSON ahead of time so neither runtime reads
  a file at request time.

## Routes

| Route | Kind | Notes |
| --- | --- | --- |
| `/[locale]/contract-check` | page (server shell + client app) | start → questionnaire / paste / photo-or-file → confirm → reality check → results → help. All state in memory; `noindex`. |
| `/[locale]/cv-check` | page (server shell + client app) | profile → paste / file / photo → confirm → results. `noindex`. |
| `/[locale]/privacy` | page | Privacy notice, MN + EN, "not yet reviewed by a lawyer" banner. |
| `/[locale]/case-delete` | page | Opens with a signed token; a button (POST) deletes the stored case file. `noindex`. |
| `/[locale]/(account)/sign-in/[[...rest]]`, `/sign-up/[[...rest]]`, `/account` | pages | The only routes that load Clerk's client JS (`ClerkProvider` in the group layout). `noindex`. |
| `POST /api/rater/extract` | route handler | `{kind: 'contract'|'cv', text}` or multipart file (PDF/DOCX) → redacted text + fields + evidence. Rate-limited. |
| `POST /api/rater/rate` | route handler | fields (+ actual schedule) → results, verdict, score, priority. Writes anonymous counters. Rate-limited. |
| `POST /api/rater/message` | route handler | fields → re-rated on the server → employer message drafted from failed rules only. |
| `POST /api/rater/template` | route handler | fields → corrected contract PDF (pdf-lib, embedded Cyrillic font). |
| `POST /api/rater/cases` | route handler | intake → Case (priority recomputed on the server, never trusted from the client). |
| `POST /api/rater/cases/delete` | route handler | signed token → delete stored file. |
| `POST /api/cv/rate` | route handler | CV fields + profile → CV results and score. |
| `POST /api/account/*` | route handlers | save rating, save profile, delete account (Clerk `auth()` required). |
| `POST /api/clerk/webhook` | route handler | Svix-verified `user.deleted` → delete every row of ours. |
| `/__clerk/*` | proxy | Clerk Frontend API proxied through this origin (`frontendApiProxy`). |

## Data model (Payload)

| Collection | Fields | Access |
| --- | --- | --- |
| `members` | `clerkUserId` (unique), `ageBand`, `guardianConsent`, `guardianConsentAt`, `targetJob`, `aimag`, `cvProfile` (json) | server only (Local API); admins may read |
| `saved-ratings` | `member`, `kind` (contract/cv), `ruleSetVersion`, `verdict`, `score`, `results` (rule id + result only), `ratedOn` | server only |
| `cases` | `caseId`, `priority`, `deadline`, `overCapacity`, `weekKey`, `status`, `outcome`, `caseworker`, `failedRules`, `ageBand`, `contactMethod`, `contact`* , `bestTime`*, `description`*, `consentToContact`, `storeFile`, `guardianConsent`, `guardianConsentAt`, `fileKey`, `fileDeleteAt`, `memberClerkId` | caseworker role only; every single-document read writes `case-access-log` |
| `case-access-log` | `case`, `user`, `action`, `at` | written by the server; read by admins and caseworkers; never edited |
| `rater-stats` | `ruleId`, `result`, `ruleSetVersion`, `month`, `ageBand`, `jobCategory`, `employerKind`, `aimag`, `count` | server only; no timestamps |
| `users` (existing) | + role `caseworker`, + `onDuty` | as before |

\* encrypted at rest with AES-GCM (field-level, key from env).

Opt-in files go to a **private** R2 bucket (`CASE_FILES_BUCKET`), encrypted
before upload, never to the public media bucket. They hold the redacted text,
the confirmed fields and the results — never an image: images are read in the
browser and never reach the server.

## Interfaces

```ts
// src/lib/extraction/ocr.ts — browser only
interface OcrEngine { recognize(image: Blob, onProgress?: (p: number) => void): Promise<{ text: string; confidence: number }> }

// src/lib/extraction/extractor.ts
interface Extractor { extract(request: { kind: 'contract' | 'cv'; text: string }): Promise<unknown> }
// AnthropicExtractor (live) and MockExtractor (no key, tests, CI)

// src/lib/extraction/service.ts — the one service both raters use
extractFields(kind, text, extractor): Promise<{ redactedText; fields; evidence; dropped: string[] }>

// src/lib/rater/engine.ts — pure
rate(fields, ratingDate, ruleSet): RatingResult   // { results[], verdict, score, priority, ruleSetVersion }
rateWithReality(written, actual, ratingDate, ruleSet): RatingResult   // per rule, the worse of the two
score(results, verdict, p1): number               // shared with the CV rater
```

## Score

`score = 100 − Σ score_weight(non-green rule)` where `score_weight` has a
`fail` and a smaller `unknown` value per rule in `rules.yaml`; then clamped into
the band of the overall verdict (red 1–39, yellow 40–74, green 75–100); any
P1 trigger caps it at 10 (and every P1 trigger is itself a red result, so the
cap never contradicts the band). All green is 100. Property tests: a red
verdict never scores ≥ 40 and never gets a green colour; unknown is never
green.

## Phase checklist

### Phase 0 — plan
- [x] Branch `feat/rater`
- [x] CLAUDE.md amendments (rules 4, 5; new 11, 12)
- [x] PLAN.md, adr-001-decisions.md, open-questions.md

### Phase 1 — Stitch design and the design system
- [x] `design/DESIGN.md` from CLAUDE.md "Design direction" and `globals.css`
- [x] Stitch project + design system from DESIGN.md
- [x] Screens, mobile 390 then desktop 1280, Mongolian copy: home, rater start, one question, confirmation, results, help/escalation, CV start, CV results, sign-in, sign-up, account, Impact restyled
- [x] Screens pulled into `design/stitch/`
- [x] Score colour stops as tokens (light + dark, ≥ 3:1 on surfaces), tested
- [x] UI pieces: `ScoreGauge`, `VerdictBadge`, `Stepper`, `FileDrop`, `EvidenceQuote`

### Phase 2 — rules engine
- [x] `rules.yaml`: M01–M11, G01–G13, Q01 (+ the two P1 answer rules, see ADR), all `lawyer_verified: false`
- [x] zod for `rules.yaml` and for the extraction schema; YAML → JSON compile + sync test
- [x] derived values: age at start, weekly hours, night overlap (past midnight), effective hourly pay, contract length, business days
- [x] `rate`, worst-of verdict, score, escalation priority, reality check
- [x] minimum wage 792,000 → 1,000,000 on 2027-01-01, basis 168 h
- [x] A/122 and light-work categories as `[ХҮЛЭЭГДЭЖ БУЙ / TBD]`; unmatched is yellow
- [x] `scripts/check-rules-verified.ts` in `prebuild` (when indexing) and CI
- [x] tests: 3 pass / 3 fail / 1 unknown per rule; date switch; 30+ scenarios; property tests; regression suite

### Phase 3 — questionnaire, results, actions
- [x] `/[locale]/contract-check`, 15 questions one per screen, progress, Back keeps answers
- [x] results: gauge + verdict, red → yellow → green, explanation word for word, article, evidence
- [x] "Talk to Ajilchin Zugii" on red; 108 at once on P1; never behind a login
- [x] employer message (LLM, failed rules only, copy button, mock without key)
- [x] corrected template: print page + PDF with embedded Cyrillic font
- [x] `noindex`, nothing in URLs, nothing stored without opt-in

### Phase 4 — extraction pipeline
- [x] text from PDF (unpdf) / DOCX (fflate + XML) on the server, in memory; OCR in the browser (tesseract.js, `mon`, self-hosted, lazy)
- [x] redaction (register no., phone, email, bank account)
- [x] Anthropic extractor (structured outputs; no temperature or forced tool use — the current API refuses both, ADR §3) + mock
- [x] evidence check; confirmation screen; corrected field names logged, never values
- [x] limits 10 pages / 15 MB; low OCR confidence → questionnaire
- [x] logger leak test; rate limiting on both runtimes
- [x] `scripts/eval-extraction.ts` + synthetic fixtures + recorded responses

### Phase 5 — CV rater
- [x] `/[locale]/cv-check`, profile first, same pipeline, CV schema with evidence
- [x] `cv-rules.yaml` (`staff_verified: false`) + gate; same score function
- [x] AI-judged checks capped at yellow and labelled; suggestions quote an excerpt

### Phase 6 — Clerk
- [x] `clerkMiddleware` composed with next-intl in `src/proxy.ts`, `frontendApiProxy`
- [x] `ClerkProvider` only in the account group; bundle test proves it
- [x] sign-in / sign-up (mnMN, enUS, appearance from CSS variables)
- [x] `members`, `saved-ratings`; guardian consent 13–17; under 13 no account
- [x] account page: history, profile, delete account and data; Svix webhook
- [x] `/[locale]/privacy`

### Phase 7 — escalations, cases, storage, analytics
- [x] intake form; `cases`; capacity 20/week in Asia/Ulaanbaatar; P1/P2/P3 rules
- [x] `caseworker` role; access log on every view
- [x] AES-GCM opt-in files in a private R2 bucket; 90-day / case-closed purge in the daily cron; signed delete link by email
- [x] P1 alert by email (+ Telegram when configured)
- [x] `rater-stats` anonymous counters
- [x] migrations for both adapters, created safely

### Phase 8 — restyle the existing site
- [x] Home, Impact, Methodology, Research, paper, Policy, About, Team, header, footer, 404, error, loading

### Phase 9 — verify, review, report
- [x] lint, typecheck, test, e2e, a11y, lhci, build, build:cf, preview:cf (local)
- [x] e2e list from the prompt, mobile + desktop
- [x] budgets; screenshots in `docs/rater/screenshots/`
- [x] independent reviewer subagent; fixes
- [x] `docs/rater/REPORT.md`

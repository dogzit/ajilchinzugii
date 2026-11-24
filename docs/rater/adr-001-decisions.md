# ADR-001 — Contract rater and CV rater: technical decisions

Status: accepted for v1 (2026-11-24). Owner: CTO. The spec's "Open technical
decisions" are answered here; the spec says the rest of the design does not
depend on which option is picked, and that is kept true by putting each
choice behind an interface.

## 1. Where the rater lives

Inside the existing Next.js app, as new routes under `/[locale]/`, with route
handlers under `/api/rater/*`. One codebase, one deploy, the same headers,
i18n, design tokens and accessibility tests. It must run on both targets the
site already builds for (Node on Vercel, Cloudflare Workers through OpenNext)
and both database adapters (Postgres, D1), so everything new is Web-standard:
`fetch`, WebCrypto, `Uint8Array`, no native binaries and no file reads at
request time.

## 2. OCR — in the browser, behind `OcrEngine`

**Decision:** tesseract.js with the Mongolian `mon` model from
`tessdata_fast`, self-hosted under `/ocr/` (worker, core WASM, model), loaded
only when the user picks a photo.

**Why:** the image never leaves the phone. The server receives text, so the
redaction step runs before anything is stored or sent anywhere, and the
Workers CPU limit is never spent on OCR.

**Ceiling:** handwriting and dark photos read badly. Low confidence sends the
user to the questionnaire instead of guessing (spec). The `OcrEngine`
interface lets a cloud engine replace it after the spec's benchmark (data
item 6, Phase 2) without touching the rest of the pipeline.

PDF and DOCX are read on the server, in memory, and discarded: `unpdf`
(pdf.js serverless build, runs on workerd) for PDF; for DOCX the file is a
ZIP, so `fflate` unzips `word/document.xml` and the text runs are read from
the XML. No DOCX library with Node-only dependencies.

## 3. LLM — Google Gemini behind `Extractor`

(Was the Anthropic API until 2026-11-24; switched at the owner's request.)

**Decision:** the Gemini API's `generateContent` over plain `fetch`
(`src/lib/llm/gemini.ts`, no SDK, so it runs unchanged on Node and Workers
and adds nothing to the bundle). Key from `GEMINI_API_KEY`, sent in the
`x-goog-api-key` header, never in the URL; model from `GEMINI_MODEL`
(`.env.example` default `gemini-3.8-flash`), never written in code. The
extraction schema is enforced with JSON output (`responseMimeType:
application/json`, `responseJsonSchema` generated from the zod schema), then
validated again with zod. Thinking level: medium for extraction, low for the
employer message. Thought parts are discarded. A blocked prompt or a
safety stop is a refusal; any HTTP error is "unavailable", with no request
or response text in the error. `MockExtractor` implements the same
interface for tests, CI and any environment without a key.

**No `temperature: 0`:** Gemini 3.6 Flash and newer ignore `temperature`.
Determinism comes from the schema, the evidence check and the fact that no
verdict depends on the model.

**Guarantees in code, not in the prompt:** the prompt tells the model that
instructions inside the document are data; the code is what enforces it —
the output is schema-validated, every excerpt must string-match the source
after normalisation or the field becomes null, and the model never produces
a verdict, a score or a priority.

**Provider terms — unresolved, see open-questions (lawyer 19, CTO 5):** the
Gemini API Additional Terms (effective 2026-03-23) say "You also will not use
the Services as part of a website, application, or other service … that is
directed towards or is likely to be accessed by individuals under the age of
18." This site is for working teens. The owner chose Gemini knowing this.
On unpaid keys Google uses prompts and responses to improve its products
and human reviewers may read them; only a Cloud project with active billing
is "Paid Services". No zero-retention option is stated in the terms.

## 4. Accounts — Clerk, optional

**Decision:** `@clerk/nextjs`. Rating never needs a login. An account adds
saved ratings (opt-in), a reusable CV profile and case tracking.

- `clerkMiddleware` composed with next-intl in `src/proxy.ts`.
- Clerk's Frontend API is proxied through this site's own origin
  (`frontendApiProxy`), so the CSP stays close to `'self'` and no Clerk
  domain is written into the code (CLAUDE.md rule 9).
- `ClerkProvider` sits only in the `(account)` route group's layout, so
  Clerk's client JS loads only on sign-in, sign-up and the account page.
  Public pages and the raters read the session on the server with `auth()`.
- Our data about a member lives in Payload (`members`), keyed by Clerk user
  id. Deleting the account deletes the Clerk user and every row of ours; a
  Svix-verified `user.deleted` webhook covers deletion started in Clerk.
- Under 13: no account (the tools still work). 13–17: a guardian ticks a
  second box, stored with a timestamp.

## 5. Storage and encryption

- **Default:** process and discard. The server holds text only for the
  length of a request; the browser holds the session in memory.
- **Opt-in case files:** a JSON bundle (redacted text, confirmed fields,
  results — never an image) encrypted with AES-256-GCM via WebCrypto, key
  `CASE_FILES_KEY` (32 bytes, base64) from env, random 96-bit IV per object,
  written to a **private** R2 bucket over the S3 API. Never the public media
  bucket. Deleted after 90 days or when the case closes, whichever is first,
  by the existing daily cron. The user gets a signed delete link (HMAC-SHA256
  with `CASE_TOKEN_SECRET`).
- **Case contact details and description** are encrypted field by field with
  the same key before they reach the database, and decrypted only for
  caseworkers.
- **Key management:** the key lives only in the platform's secret store
  (Vercel env, `wrangler secret`). Rotation = new key, re-encrypt open cases
  (script deferred; noted in REPORT.md).

## 6. Caseworker view — Payload admin

**Decision:** cases are a Payload collection; caseworkers are Payload users
with a new `caseworker` role. Only that role can open a case; every
single-case read writes a `case-access-log` row (who, which case, when).
No separate tracker, no second login system for staff.

## 7. P1 alert channel

**Decision:** email through the existing adapter (Resend on Workers, SMTP on
Node) to every user marked `onDuty`, plus Telegram (`sendMessage` over HTTPS)
when `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID` are set. The alert carries
the case ID, priority and deadline only — no contact details, no description.
SMS is not built (needs a paid gateway; not approved).

## 8. The shared extraction service

`src/lib/extraction/` is used by both raters:

```
file → text (browser OCR for images; unpdf / DOCX-XML on the server)
     → redact (register no. → [ID], phone → [PHONE], email → [EMAIL], bank account → [ACCOUNT])
     → Extractor.extract({ kind, text })        // contract or CV schema
     → zod validation (whole response rejected if the shape breaks)
     → evidence check (excerpt must string-match the redacted text after normalisation; else the field is null)
     → confirmation screen (value beside excerpt, editable; only corrected field NAMES are logged)
```

`kind` selects the schema and the prompt; everything else is shared.

## 9. Rules as data

`rules.yaml` and `cv-rules.yaml` are the source. A small compile step turns
them into JSON that both runtimes import (no YAML parser and no file read at
request time); a unit test fails if the JSON is out of step with the YAML.
The YAML holds every threshold, wage, date, article, explanation, weight and
escalation; the engine holds one evaluator per rule id that reads its
parameters from the YAML. `check` in the YAML is the plain-language statement
of what the evaluator tests. `rate(fields, ratingDate, ruleSet)` takes the
rule set itself (which carries its version) rather than a version string, so
tests can rate against a modified set — for example one where an A/122
category is filled in — without a registry.

## 10. P1 answers are rules

The spec makes "can't quit" and "injured" P1 triggers, and the prompt caps a
P1 score at 10. A score of 10 sits in the red band, so a P1 trigger must
also make the verdict red, or the gauge and the verdict word would disagree.
They are therefore two extra rules in `rules.yaml` (`Q02_CANNOT_QUIT`,
`Q03_INJURED`), red, P1, article to be assigned by the lawyer. Asked in the
questionnaire and in the reality check after a document.

## 11. Rate limiting

A fixed-window counter per client IP hash, in memory, inside each runtime
instance. Works unchanged on Node and Workers. Ceiling: on Workers each
isolate counts on its own, so the effective limit is per isolate. Upgrade
path: Cloudflare's Rate Limiting binding on Workers, or a shared store.
The IP is hashed with a per-process random salt and never logged.

## 12. Anonymous analytics

`rater-stats` holds counters, not events: one row per (rule, result, rule set
version, month, age band, job category, employer kind, aimag-if-picked),
with a `count`, and no timestamps — so no two rows can be joined back into
one person's rating. Any public figure drawn from it goes through small-cell
suppression (CLAUDE.md rule 12).

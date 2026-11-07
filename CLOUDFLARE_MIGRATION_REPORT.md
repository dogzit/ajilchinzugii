# Cloudflare Workers migration — status

Branch `cloudflare-migration`. Vercel is untouched and still production;
`main` has not been pushed to.

**Headline: the code is finished, the deployment is not.** Every step that
could be done without a different API token is done and verified locally in
`workerd`. The deploy to `*.workers.dev` is blocked on the token's
permissions, and everything downstream of the deploy is blocked with it.

---

## 1. Billing — treated as NOT APPROVED

The instruction read:

> Billing: Workers Paid ($5/mo) and Cloudflare Images are
> `[APPROVED up to $__/month  <- EDIT THIS, or write NOT APPROVED]`

That is the unedited template. An amount was never filled in and
`NOT APPROVED` was never written, so there is no approval to read — a
placeholder nobody completed is not permission to spend money. Following the
fallback in the same instruction, I finished all the code and skipped only
what would enable new billing.

Nothing was enabled. Nothing is being charged. Two consequences:

- **Workers Paid is still required before this can serve traffic.** The free
  plan allows 10 ms CPU per request; this app renders Payload-backed pages
  and will exceed that immediately. Bundle size is *not* a problem — 36.8 MB
  uncompressed against a 64 MiB limit.
- **Cloudflare Images is not enabled**, so `/_next/image` returns the
  original image rather than a resized one. Pages are correct, just heavier.

---

## 2. Done and verified

### EXIF stripping — done, verified
`src/lib/exif.ts`, called from the Media `beforeOperation` hook.

Implemented **without** the Images binding, deliberately: the binding is a
paid product that is not approved, and stripping at upload is the better
design anyway — originals land in R2 already clean instead of being cleaned
on the way out. Your own stated goal ("so originals land in R2 already
clean") is met.

| Format | Removed |
| --- | --- |
| JPEG | every APP segment above APP0, plus comments |
| PNG | `tEXt` `zTXt` `iTXt` `eXIf` `tIME` (colour chunks kept) |
| WebP | `EXIF`, `XMP `, with VP8X flags and RIFF length rewritten |

- **Fails closed.** The hook refuses anything it cannot clean rather than
  storing it. A test caught this: the first version silently passed AVIF
  through. AVIF is also no longer an accepted upload type — its metadata
  needs a full ISOBMFF rewrite and there is no `sharp` on Workers to
  re-encode it away.
- **Runs on both runtimes**, not only Workers, so the guarantee no longer
  depends on which platform the site is on.
- **Verified**: 11 tests. Fixtures are built with `sharp` so the metadata is
  what a real camera writes, and `sharp` reads the output back to confirm it
  is gone — including the failure path.
- **Not verified**: `exiftool` against a stored R2 object, because that
  needs the deploy. The equivalent assertion runs in the test suite.

### Email — done, needs a key
`src/payload/email.ts`. SMTP is TCP and a Worker cannot open one, so
`nodemailer` stops working the moment the site runs here — and "Forgot
password" stops with it silently, because Payload writes the mail to a log.

Resend over HTTP is now preferred wherever a key is set; `nodemailer` is
kept for Node, so Vercel and the CLI are unaffected. The From address falls
back to the SMTP one, so one mailbox serves both.

**Verified** against a stubbed `fetch`: the request shape, address
flattening, the refusal path, and that the API key never reaches the error
message. **Not verified**: a real send — see *What I still need from you*.

### Cron — done, verified
`worker/index.js` wraps OpenNext's generated worker, re-exports its three
Durable Objects, and adds the `scheduled` handler a Cloudflare cron trigger
needs. It re-uses the existing `/api/revalidate` route rather than
reimplementing it, so there is one definition of revalidation and one place
the secret is checked. Trigger is `0 22 * * *`, the hour `vercel.json` used.

**Verified** by invoking the handler in `workerd`: `outcome: "ok"`, and the
worker logged `[cron] revalidated the impact figures`.

### Image optimisation — root cause found and fixed in code
`/_next/image` was returning 404 for everything in the Media collection.
OpenNext resolves a *relative* image URL through the `ASSETS` binding, which
holds the build's static files and knows nothing of Payload's
`/api/media/file/...` route. Absolute URLs take the other branch and are
fetched over the network, which reaches it.

`mediaSrc` therefore stops reducing same-origin URLs to paths on the Workers
build, and the site's own host joins `remotePatterns`.

**Verified**: `/_next/image?url=/logo.png` returns 200 with an image body —
that path already took the working branch. **Not verified**: the same for a
Media URL, because it needs an https origin, i.e. the deploy.

### The app runs on Workers at all — verified
The biggest unknown. Payload CMS inside Next 16 boots in `workerd` and talks
to Neon. `/mn`, `/en`, `/en/about`, `/mn/research`, `/mn/team/erdenebat`,
`/mn/policy`, `/mn/impact`, `/sitemap.xml`, `/guide` and **`/admin`** all
return 200.

Two bundler blockers were cleared to get there: Payload's unhoisted
`drizzle-kit/api` require, and `sharp`, both stubbed — `sharp` only when
`BUILD_TARGET=cloudflare`, so that remains the single switch and the Vercel
build still compiles with the real one (re-verified just now).

---

## 3. Blocked

### BLOCKED — deploy to workers.dev · API token permissions
```
A request to the Cloudflare API
(/accounts/2859bc46088a8a760781284a4cfe8754/workers/scripts/ajilchinzugii/secrets)
failed.
```
The token can *read* Workers scripts (`GET /workers/scripts` returns `[]`)
but cannot write secrets. Four approaches tried: with `.dev.vars`, without
it, with and without the R2 cache binding, and with `--cacheChunkSize 4`.

**Everything downstream is blocked by this**: the workers.dev smoke test, the
`exiftool` check on a stored object, the real password-reset send, a live DB
read/write through the Worker, and `/_next/image` on a Media URL.

### BLOCKED — Hyperdrive · same token
```
A request to the Cloudflare API (/accounts/.../hyperdrive/configs) failed.
Authentication error [code: 10000]
```
Not on the critical path: the Worker already reaches Neon directly through
the pooled URL and renders pages. Hyperdrive is a latency improvement, so it
was skipped rather than worked around. No data was moved; Neon remains the
database, as instructed.

### BLOCKED — R2 incremental cache · deploy hangs
`opennextjs-cloudflare deploy` hangs indefinitely on "Populating remote R2
incremental cache": no error, no progress, `object_count` stays 0. The
population step runs a temporary worker, which is most likely the same
missing permission.

Switched off for now, with the reasoning recorded in `open-next.config.ts`
next to the one-line restoration. ISR still behaves correctly; it just
re-renders more often than it needs to.

---

## 4. What I still need from you

1. **A new API token** with, at minimum:
   - Account → Workers Scripts → **Edit**
   - Account → Workers R2 Storage → **Edit**
   - Account → Hyperdrive → **Edit**
   - Account → Account Settings → **Read** (to resolve the workers.dev subdomain)

   Put it in `.env.local` as `CLOUDFLARE_API_TOKEN`. Everything blocked above
   should then run unattended.

2. **A billing decision**, written as an amount or `NOT APPROVED`:
   - Workers Paid, $5/mo — **required** for this to serve traffic at all.
   - Cloudflare Images — optional; without it images are unoptimised.

3. **`RESEND_API_KEY`** (and optionally `RESEND_FROM`), or tell me to use
   Cloudflare Email Service instead. Until one exists, admin password reset
   does not work on Workers.

4. **Confirm Zolbayar is 18 or over.** The biography describes a 12th-grade
   student and names the school. Rule 4 allows no minor's school anywhere on
   this site. The Team row's `confirmedAdult18Plus` is ticked; if that is not
   accurate, the school name has to come out and the entry with it.

5. **Read the two Mongolian biographies.** They are my translations of the
   English you supplied — same claims, same order, nothing invented — but
   they should be yours before they stand as the organisation's voice.

---

## 5. Resources created, and their cost

| Resource | Status | Cost |
| --- | --- | --- |
| R2 bucket `ajilchinzugii-next-cache` | **Created**, empty, unused | £0 — within the R2 free tier; nothing was ever written to it |
| Hyperdrive config | **Not created** — blocked | — |
| Worker script | **Not created** — blocked | — |
| Worker secrets | **Not set** — blocked | — |
| Workers Paid | **Not enabled** | — |
| Cloudflare Images | **Not enabled** | — |

Net new spend so far: **nothing**. The one created resource is an empty
bucket; delete it with
`pnpm exec wrangler r2 bucket delete ajilchinzugii-next-cache` if you decide
against this migration.

---

## 6. Site audit

Everything below was run against the current branch.

**Green:** 342 unit tests · 99 e2e (2 skipped) · 31 accessibility checks ·
Lighthouse accessibility **1.00**, best-practices **1.00**, performance
**0.95** · all 20 sitemap URLs 200 · all 24 unique internal links resolve ·
no CMS content placeholders left · the Vercel build still compiles.

### Issues found

1. **Performance budget fails on `/mn/about` by 0.3%** — 401,149 bytes
   against a 400,000 budget. Other pages pass (`/mn` 371.9 KB, `/en` 381.9
   KB, `/mn/impact` 373.5 KB). Cause is fonts: six `woff2` files totalling
   ~123 KB, and About pulls one extra Cyrillic subset the others do not.
   *Fix:* audit whether every Onest weight (400/500/600) is actually used and
   drop any that is not; if all three are needed, raise the budget
   deliberately rather than leaving CI red. ~1 hour.

2. **Flaky unit test** — `impact-pipeline > logs the error type and the time`
   failed once in roughly five full runs, then passed 3/3 in isolation and
   3/3 in a row afterwards. It asserts `console.error` was called *exactly
   once*, which is sensitive to any other log line in the same tick.
   *Fix:* assert on the matching call rather than the call count. ~15 min.

3. **The placeholder checker counts its own comments** — it reports "5 to
   replace" in `src/payload/seed-org.ts`, all of which are the letters "TBD"
   inside explanatory comments. Real content is clean ("content: nothing to
   replace"). *Fix:* have the scan skip comments, or exclude the seed's own
   source. ~20 min. Low priority, but it will cause a false alarm at launch,
   since the check gates the build once `NEXT_PUBLIC_ALLOW_INDEXING=true`.

4. **Image optimisation is off on Workers** until Cloudflare Images is
   enabled — originals are served at full size. Correct, but it spends the
   performance budget that issue 1 is already over.

5. **One database serves local, CI and production.** Raised before and still
   true: `pnpm seed:org` and `pnpm migrate` on a laptop write straight to the
   live database. *Fix:* a Neon branch for development. This is the highest-
   value fix on the list and nothing here depends on it.

6. **Hyperdrive absent** — the Worker will open a direct connection to Neon
   per isolate. Works, but pooling and cached reads are what Hyperdrive is
   for. Unblocked by the new token.

### Suggested order
Token → deploy → smoke test (1, 2 above can wait) → billing decision →
Images + Hyperdrive → fonts → Neon dev branch → flaky test → placeholder
checker.

---

## 7. Cutover checklist

Do not start until the smoke test passes against workers.dev.

1. **Keep Vercel serving.** Change nothing about the Vercel project, its env
   vars, or the domain while testing.
2. `pnpm deploy:cf`, then `scripts/smoke-test.sh https://<name>.workers.dev`.
   Every check must pass.
3. Exercise by hand what the script cannot: log into `/admin`, upload a photo
   with GPS, download it from R2 and run `exiftool` on it, and request a
   password reset.
4. **Set `NEXT_PUBLIC_SITE_URL` to the workers.dev URL for that build**, and
   leave `SITE_CANONICAL_HOST` and `OLD_HOSTS` unset on the Worker. If
   `SITE_CANONICAL_HOST` is set, workers.dev will redirect to the live
   domain and you will be testing production. Leave
   `NEXT_PUBLIC_ALLOW_INDEXING` unset so workers.dev is never indexed.
5. **Only then DNS.** Add the custom domain to the Worker, set
   `NEXT_PUBLIC_SITE_URL` and `SITE_CANONICAL_HOST` to the real domain,
   rebuild and redeploy, and verify on the workers.dev URL first.
6. Lower the DNS TTL to 60 s a day ahead, then switch.
7. **Leave Vercel deployed and able to serve for at least a week.** Do not
   delete the project or its env vars.

### Rollback
Point DNS back at Vercel. Nothing else is needed: the database, the media
bucket and all content are shared, so Vercel serves the same site from the
same data the moment DNS returns. This is the reason for keeping Neon rather
than moving to D1 — there is no data to migrate back.

The only thing not shared is the Workers incremental cache, which is off.

### Afterwards
Keep `BUILD_TARGET=cloudflare` as the only switch between targets, so the
Vercel build stays buildable as a rollback for as long as you want one.
`CLAUDE.md` still documents Vercel and Neon as the stack; update it only once
the cutover is real.

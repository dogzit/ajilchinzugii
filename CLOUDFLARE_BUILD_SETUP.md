# Deploying to Cloudflare Workers

The build settings and environment variables for running this site on
Cloudflare Workers, and the mistakes that are easy to make.

Vercel stays untouched by all of this. Nothing here changes DNS, the Vercel
project, or the Neon database.

---

## Why Workers and not Pages

A Cloudflare **Pages** project running `pnpm build` will fail, and that is not
a configuration problem. Pages builds plain `next build` output, and this app
is Payload CMS running inside Next.js: it needs a server runtime, an adapter,
and the bundler workarounds in `next.config.ts`. The working path is
**Workers + OpenNext**, which is what `pnpm build:cf` produces.

If you created a Pages project, delete it and create a Worker instead
(Workers → Create → Connect to Git).

---

## Build settings

| Setting | Value |
| --- | --- |
| Branch | `cloudflare-migration` |
| Build command | `pnpm build:cf` |
| Deploy command | `pnpm exec opennextjs-cloudflare deploy` |
| Build output directory | *(leave empty — the Worker is `.open-next/worker.js`, and `wrangler.jsonc` already points at the entry)* |
| Node version | 22 or newer |

`pnpm build:cf` is `BUILD_TARGET=cloudflare opennextjs-cloudflare build`. That
one variable is the only switch between the two targets: it swaps `sharp`
for a stub (a native binary cannot load in workerd) and makes media URLs
absolute so the image optimiser can fetch them. With it unset, the build is
the ordinary Vercel one, with the real `sharp`.

**Workers Paid is required.** Not for bundle size — 36.8 MB against a 64 MiB
limit — but for CPU: the free plan allows 10 ms per request, and rendering a
Payload-backed page will not fit in that.

---

## Variables

Set these with `wrangler`, which writes them as encrypted secrets:

```bash
pnpm exec wrangler secret put NEXT_PUBLIC_SITE_URL
```

Or all at once from a JSON file of `{"NAME": "value"}`:

```bash
pnpm exec wrangler secret bulk secrets.json
```

### Required — the build fails without them

`next.config.ts` now checks these together and fails once with the whole
list, rather than one failed build per variable.

| Variable | Why the build needs it |
| --- | --- |
| `NEXT_PUBLIC_SITE_URL` | every canonical, hreflang, sitemap and OG URL is built from it |
| `PAYLOAD_SECRET` | Payload will not start, and the build renders CMS pages |
| `DATABASE_URL` | the research and team pages read their slugs from Postgres at build time |

### Required at runtime

| Variable | For |
| --- | --- |
| `DATABASE_URL_UNPOOLED` | migrations only (`pnpm migrate`), never the running site |
| `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`, `R2_ENDPOINT` | media storage. Omit them and uploads fail; existing pages still render |
| `R2_PUBLIC_URL` | serves media straight from the bucket. Empty is fine — media then goes through Payload's own route |
| `NEXT_PUBLIC_CONTACT_EMAIL` | the address in the footer |
| `REVALIDATE_SECRET` | the manual revalidation endpoint |
| `CRON_SECRET` | the daily cron. Without it the scheduled handler logs and skips |
| `GOOGLE_SA_EMAIL`, `GOOGLE_SA_PRIVATE_KEY`, `IMPACT_SHEET_ID` | the impact figures. Without them the impact page shows its "no figures yet" state |
| `RESEND_API_KEY`, `RESEND_FROM` | admin password-reset mail. **Not optional in practice** — `nodemailer` cannot open SMTP from a Worker, so without a Resend key "Forgot password" silently does nothing |

### Deliberately left unset on a test deployment

| Variable | What setting it would do |
| --- | --- |
| `SITE_CANONICAL_HOST` | redirect the workers.dev URL to the live domain, so you would be testing production without realising |
| `OLD_HOSTS` | the same, for old domains |
| `NEXT_PUBLIC_ALLOW_INDEXING` | let a search engine index the test URL |
| `DEPLOY_ENV` | mark this as the real production deployment |

---

## `DEPLOY_ENV`, and the trap it replaces

Indexing used to be gated on `VERCEL_ENV === 'production'`. No platform but
Vercel sets that, so on Workers the condition is never true and **the whole
site would have gone out `noindex` with `Disallow: /`** — silently, because
nothing about it looks like a failure.

`DEPLOY_ENV=production` is the platform-neutral replacement. `VERCEL_ENV` is
still honoured, so the Vercel deployment is unaffected.

At cutover, indexing needs **both**:

```
DEPLOY_ENV=production
NEXT_PUBLIC_ALLOW_INDEXING=true
```

and `NEXT_PUBLIC_SITE_URL` pointing at the real domain. The launch guard
refuses the build if that URL is a platform host — `.workers.dev` included —
so you cannot open indexing on a test deployment by accident.

---

## Migrations

Migrations are **not** run by the Workers build. `drizzle-kit` is stubbed out
of the bundle, because a running site never generates schema.

Run them from a machine with `DATABASE_URL_UNPOOLED`:

```bash
pnpm migrate
```

The database is shared by local, CI and production, so a migration applies
everywhere at once. Nothing to do at cutover.

---

## Known gaps

- **R2 incremental cache is off.** Its binding makes
  `opennextjs-cloudflare deploy` run a cache-population step that hung
  indefinitely under the old API token. Worth retrying now that the token has
  Workers edit: add the `NEXT_INC_CACHE_R2_BUCKET` binding back to
  `wrangler.jsonc` and the `r2IncrementalCache` override to
  `open-next.config.ts`. ISR is correct without it, just less efficient.
- **Hyperdrive is not configured.** The Worker opens a direct pooled
  connection to Neon. It works; Hyperdrive would add pooling and cached reads.
- **Image optimisation needs Cloudflare Images.** Without it OpenNext returns
  the original image untouched — correct, but heavier.

---

## Rollback

Point DNS back at Vercel. The database, the media bucket and all content are
shared, so Vercel serves the same site from the same data immediately. There
is no data to migrate back — which is the reason for keeping Neon rather than
moving to D1.

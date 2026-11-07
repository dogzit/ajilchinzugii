import { defineCloudflareConfig } from '@opennextjs/cloudflare';

/**
 * How the Next.js build is adapted to run on Workers.
 *
 * No `incrementalCache` override is set, so OpenNext keeps its default and
 * the deploy has nothing to pre-populate.
 *
 * The R2-backed cache (`@opennextjs/cloudflare/overrides/incremental-cache/
 * r2-incremental-cache`) is the one to want here — it is what makes
 * `revalidatePath`, `revalidateTag` and the `revalidate` exports persist
 * across isolates, which on Vercel came with the platform. It is switched
 * off because `opennextjs-cloudflare deploy` hangs indefinitely on
 * "Populating remote R2 incremental cache" with this account's API token:
 * no error, no retry, and `object_count` stays at 0. Tried twice, including
 * with `--cacheChunkSize 4`. The population step runs a temporary worker,
 * which is likely the permission the token is missing — the same token
 * cannot create a Hyperdrive config or read the account subdomain either.
 *
 * Until that is sorted, ISR still behaves correctly; it just re-renders more
 * often than it needs to. Restoring it is one import and one line.
 */
export default defineCloudflareConfig();

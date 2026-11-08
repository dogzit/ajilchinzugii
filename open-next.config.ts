import { defineCloudflareConfig } from '@opennextjs/cloudflare';
import r2IncrementalCache from '@opennextjs/cloudflare/overrides/incremental-cache/r2-incremental-cache';

/**
 * How the Next.js build is adapted to run on Workers.
 *
 * The incremental cache is what makes `revalidatePath`, `revalidateTag` and
 * the `revalidate` exports mean anything here — on Vercel that storage came
 * with the platform. It also holds prerendered output: without it a
 * `force-static` route handler such as /guide has nowhere to serve its body
 * from and is executed on every request instead, which fails the moment it
 * touches the filesystem.
 *
 * R2 holds it, in a bucket of its own.
 */
export default defineCloudflareConfig({
  incrementalCache: r2IncrementalCache,
});

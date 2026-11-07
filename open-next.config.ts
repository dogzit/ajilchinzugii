import { defineCloudflareConfig } from '@opennextjs/cloudflare';
import r2IncrementalCache from '@opennextjs/cloudflare/overrides/incremental-cache/r2-incremental-cache';

/**
 * How the Next.js build is adapted to run on Workers.
 *
 * The incremental cache is what makes `revalidatePath`, `revalidateTag` and
 * the `revalidate` exports mean anything here — on Vercel that storage came
 * with the platform. R2 holds it, in its own bucket.
 */
export default defineCloudflareConfig({
  incrementalCache: r2IncrementalCache,
});

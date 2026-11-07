/**
 * The deployed Worker: OpenNext's handler, plus a cron.
 *
 * OpenNext generates `.open-next/worker.js` with a `fetch` handler and the
 * Durable Objects its cache needs. It has no `scheduled` handler, and a
 * Cloudflare cron trigger calls `scheduled`, not a URL — so the daily
 * revalidation that `vercel.json` ran as an HTTP cron has nowhere to land
 * unless something wraps the generated worker. This is that wrapper.
 *
 * Deliberately JavaScript. It imports a file that only exists after a build,
 * and `tsconfig.json` type-checks every `.ts` in the repo, so as TypeScript
 * this would fail on a clean clone before anything had been built.
 *
 * The cron re-uses the existing route rather than reimplementing it: one
 * definition of what revalidation means, already covered by its own tests,
 * and one place where the secret is checked.
 */

import openNextWorker from '../.open-next/worker.js';

// The cache's Durable Objects have to stay exported from the entry point, or
// the bindings in wrangler.jsonc have nothing to point at.
export {
  DOQueueHandler,
  DOShardedTagCache,
  BucketCachePurge,
} from '../.open-next/worker.js';

const handler = {
  fetch(request, env, ctx) {
    return openNextWorker.fetch(request, env, ctx);
  },

  async scheduled(controller, env, ctx) {
    const at = new Date().toISOString();

    if (!env.CRON_SECRET) {
      // Without the secret the route answers 401 and the figures quietly go
      // stale, so say so rather than let a green cron hide it.
      console.error(`[cron] CRON_SECRET is not set; skipped revalidation at ${at}`);
      return;
    }

    const base = env.NEXT_PUBLIC_SITE_URL || 'https://ajilchinzugii.com';
    const request = new Request(new URL('/api/revalidate', base), {
      method: 'GET',
      headers: { authorization: `Bearer ${env.CRON_SECRET}` },
    });

    const response = await openNextWorker.fetch(request, env, ctx);

    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      throw new Error(
        `[cron] revalidation failed (${response.status}) at ${at}: ${detail.slice(0, 200)}`,
      );
    }

    console.log(`[cron] revalidated the impact figures at ${at}`);
  },
};

export default handler;

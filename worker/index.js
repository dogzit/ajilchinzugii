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

// The cache's Durable Objects have to stay exported from the entry point, or
// the bindings in wrangler.jsonc have nothing to point at. They are taken
// from their own modules rather than from `worker.js`, because a static
// re-export would evaluate that module — and the whole point below is that
// it must not be evaluated until Hyperdrive has been wired in.
export { DOQueueHandler } from '../.open-next/.build/durable-objects/queue.js';
export { DOShardedTagCache } from '../.open-next/.build/durable-objects/sharded-tag-cache.js';
export { BucketCachePurge } from '../.open-next/.build/durable-objects/bucket-cache-purge.js';

/**
 * Point Payload at Hyperdrive.
 *
 * `payload.config.ts` reads `process.env.DATABASE_URL` when its module is
 * first evaluated, and a Hyperdrive connection string only exists on `env`,
 * at runtime, inside a Worker. Setting it here — before the request reaches
 * Next, and so before any route module is loaded — means the config picks up
 * the right value without knowing Hyperdrive exists.
 *
 * Doing it in the Worker entry rather than in the config is what keeps this
 * to the Workers build: Vercel and the CLI never load this file, so they go
 * on using the Neon connection string directly through `pg`.
 *
 * Without it, `node-postgres` opens a raw TCP connection from workerd, which
 * either takes several seconds or never completes.
 */
let workerPromise;

function loadWorker(env) {
  if (!workerPromise) {
    const connectionString = env.HYPERDRIVE?.connectionString;
    if (connectionString) process.env.DATABASE_URL = connectionString;

    // Imported dynamically, and only now. A static import is hoisted and
    // evaluated before any code in this file runs, which is how the first
    // attempt failed: `payload.config` had already read the old
    // `DATABASE_URL` and built its pool from it, so the assignment above
    // changed nothing and every database page still went out over raw TCP.
    workerPromise = import('../.open-next/worker.js');
  }
  return workerPromise;
}

const handler = {
  async fetch(request, env, ctx) {
    const worker = await loadWorker(env);
    return worker.default.fetch(request, env, ctx);
  },

  async scheduled(controller, env, ctx) {
    const worker = await loadWorker(env);
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

    const response = await worker.default.fetch(request, env, ctx);

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

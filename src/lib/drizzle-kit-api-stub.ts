/**
 * A stand-in for `drizzle-kit/api` inside the bundled server.
 *
 * Payload's Postgres adapter `require`s `drizzle-kit/api` to generate and
 * push schema. None of that happens in a running site: `push` is off
 * (payload.config.ts) and migrations are generated and applied by the CLI,
 * in Node, outside this bundle.
 *
 * It still has to resolve to something. `drizzle-kit` is a dev dependency of
 * the adapter and is not hoisted, so Turbopack emits an unresolvable
 * external and the Workers bundle fails to build on it. Aliasing it here
 * gives the bundler a real module and keeps the dead branch dead.
 *
 * Each export throws rather than returning a plausible empty value: if any
 * of this is ever reached in a deployed site, that is a bug worth hearing
 * about loudly, not a schema change quietly doing nothing.
 */

const unavailable = (name: string) => () => {
  throw new Error(
    `drizzle-kit is not bundled with the server: ${name}() was called at runtime. ` +
      'Schema work belongs to `pnpm migrate:create` and `pnpm migrate`, which run in Node.',
  );
};

export const generateDrizzleJson = unavailable('generateDrizzleJson');
export const generateMigration = unavailable('generateMigration');
export const pushSchema = unavailable('pushSchema');
export const upPgSnapshot = unavailable('upPgSnapshot');
export const generateSQLiteDrizzleJson = unavailable('generateSQLiteDrizzleJson');
export const generateSQLiteMigration = unavailable('generateSQLiteMigration');
export const pushSQLiteSchema = unavailable('pushSQLiteSchema');

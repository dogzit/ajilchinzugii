import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { sqliteD1Adapter } from '@payloadcms/db-d1-sqlite';
import { postgresAdapter } from '@payloadcms/db-postgres';
import { lexicalEditor } from '@payloadcms/richtext-lexical';
import { s3Storage } from '@payloadcms/storage-s3';
import { buildConfig } from 'payload';
import sharp from 'sharp';
import { Media } from './payload/collections/media';
import { buildEmailAdapter } from './payload/email';
import { Papers } from './payload/collections/papers';
import { Partners } from './payload/collections/partners';
import { Team } from './payload/collections/team';
import { Users } from './payload/collections/users';
import { ImpactSnapshot } from './payload/globals/impact-snapshot';
import { Methodology } from './payload/globals/methodology';
import { Policy } from './payload/globals/policy';
import { Site } from './payload/globals/site';

const dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Migrations and schema work talk to the database directly; the running app
 * goes through Neon's pooler. `DATABASE_MIGRATING=true` is set by the migrate
 * scripts in package.json.
 */
const isMigrating = process.env.DATABASE_MIGRATING === 'true';

/** True inside workerd. Vercel, the CLI and the tests all answer false. */
const onWorkers =
  typeof navigator !== 'undefined' &&
  (navigator as { userAgent?: string }).userAgent === 'Cloudflare-Workers';

/**
 * Postgres through Hyperdrive, when running on Cloudflare.
 *
 * `node-postgres` opens a raw TCP connection, and from deployed workerd that
 * handshake either takes seconds or never completes — database-backed pages
 * hung for seventy seconds or returned 500. Hyperdrive terminates the
 * Postgres protocol on Cloudflare's side and hands the Worker a local
 * connection string instead. Neon is still the database.
 *
 * It has to be read here, at config evaluation, and not anywhere earlier.
 * The connection string only exists on the Worker's `env`, and this module
 * builds its pool the moment it is evaluated — which happens as the module
 * graph loads, before the first request. Assigning `process.env.DATABASE_URL`
 * from inside `fetch` is therefore always too late, however the import is
 * arranged: the pool has already been built from whatever was there before.
 *
 * Nothing is imported off Workers, so the Vercel build and the CLI never see
 * `@opennextjs/cloudflare` and go on using `DATABASE_URL` directly. If the
 * lookup fails for any reason, the fallback is the same path, so a broken
 * binding degrades to the old behaviour rather than to no database at all.
 */
async function hyperdriveConnectionString(): Promise<string | undefined> {
  if (!onWorkers) return undefined;
  try {
    const { getCloudflareContext } = await import('@opennextjs/cloudflare');
    const { env } = await getCloudflareContext({ async: true });
    return (env as { HYPERDRIVE?: { connectionString?: string } })?.HYPERDRIVE
      ?.connectionString;
  } catch {
    return undefined;
  }
}

const connectionString = isMigrating
  ? // Migrations run in Node, from the CLI, straight at Neon. They never run
    // on Workers: `drizzle-kit` is stubbed out of that bundle entirely.
    (process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL)
  : ((await hyperdriveConnectionString()) ?? process.env.DATABASE_URL);

const r2Endpoint =
  process.env.R2_ENDPOINT ??
  (process.env.R2_ACCOUNT_ID
    ? `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`
    : undefined);

const r2PublicUrl = process.env.R2_PUBLIC_URL?.replace(/\/$/, '');

/**
 * R2 is only wired up when it is fully configured. Without it Payload falls
 * back to serving files through its own route, which keeps `pnpm build` and
 * the tests runnable without secrets.
 */
const r2Configured = Boolean(
  r2Endpoint &&
  process.env.R2_BUCKET &&
  process.env.R2_ACCESS_KEY_ID &&
  process.env.R2_SECRET_ACCESS_KEY,
);

/**
 * The database, during the move from Neon to D1.
 *
 * `DB_DRIVER=d1` selects D1; anything else keeps Postgres. Both have to work
 * at once for the whole of the migration: Neon stays the live database and
 * the rollback for two weeks after cutover, the CLI runs migrations and the
 * copy script against it, and the Vercel build needs it untouched. A switch
 * that could only be thrown once would make all of that impossible.
 *
 * D1 is reachable only through a Worker binding, so the adapter gets a
 * binding rather than a connection string. That works during the build as
 * well: `getCloudflareContext({ async: true })` falls back to wrangler's
 * platform proxy for statically generated routes, which is what
 * `generateStaticParams` on the research and team pages needs.
 */
async function databaseAdapter() {
  if (process.env.DB_DRIVER?.trim() !== 'd1') {
      return postgresAdapter({
      /*
       * `maxUses: 1` on Workers — Cloudflare's own setting for Payload here.
       *
       * workerd refuses I/O that was begun in one request context and reused
       * in another, so a pooled connection must not outlive the request that
       * opened it. `maxUses` retires a connection after a single checkout,
       * which gives each request its own without touching the pool's size or
       * its idle behaviour. Hyperdrive does the real pooling on Cloudflare's
       * side, so opening afresh costs little.
       *
       * Not `idleTimeoutMillis: 0` with `max: 1`, which was tried and made it
       * strictly worse: that closes connections while they are still in use
       * and every page failed.
       *
       * Node keeps the ordinary pool, where holding connections open between
       * requests is the whole point.
       */
      pool: onWorkers ? { connectionString, maxUses: 1 } : { connectionString },
      // Never let the app alter the schema on boot — production changes go
      // through a generated, reviewed migration.
      push: false,
      migrationDir: path.resolve(dirname, 'migrations'),
    });
  }

  // The binding type is taken from the adapter rather than from a global,
  // so this file needs no ambient Workers types to compile on Vercel.
  type D1Binding = Parameters<typeof sqliteD1Adapter>[0]['binding'];

  const { getCloudflareContext } = await import('@opennextjs/cloudflare');
  const { env } = await getCloudflareContext({ async: true });
  const binding = (env as { DB?: D1Binding }).DB;

  if (!binding) {
    throw new Error(
      'DB_DRIVER=d1 but no D1 binding named DB was found. Check the ' +
        '`d1_databases` entry in wrangler.jsonc, and that the build can reach it.',
    );
  }

  return sqliteD1Adapter({
    binding,
    push: false,
    migrationDir: path.resolve(dirname, 'migrations-d1'),
  });
}

export default buildConfig({
  serverURL: process.env.NEXT_PUBLIC_SITE_URL,
  secret: process.env.PAYLOAD_SECRET ?? '',
  // Undefined when no SMTP credentials are set; Payload then logs mail
  // instead of sending it, which keeps builds and tests credential-free.
  email: buildEmailAdapter(),
  admin: {
    user: Users.slug,
    importMap: { baseDir: path.resolve(dirname) },
    meta: {
      titleSuffix: ' — Ажилчин Зөгий',
      description:
        'Ажилчин Зөгий — агуулгын удирдлага / content management for Ajilchin Zogii',
    },
    components: {
      // A show/hide control on every password field, including the login and
      // create-first-user forms Payload renders itself.
      afterLogin: ['@/payload/components/PasswordToggle#PasswordToggle'],
      // The handbook, one click from the screen the editor is stuck on.
      afterNavLinks: ['@/payload/components/GuideLink#GuideLink'],
      graphics: {
        Logo: '@/payload/components/BrandLogo#BrandLogo',
        Icon: '@/payload/components/BrandIcon#BrandIcon',
      },
    },
  },
  collections: [Papers, Team, Partners, Media, Users],
  globals: [Site, Methodology, Policy, ImpactSnapshot],
  localization: {
    locales: [
      { code: 'mn', label: 'Монгол' },
      { code: 'en', label: 'English' },
    ],
    defaultLocale: 'mn',
    // An untranslated field falls back to Mongolian rather than rendering empty.
    fallback: true,
  },
  editor: lexicalEditor({}),
  // Image processing: resizing, format conversion and metadata stripping.
  sharp,
  db: await databaseAdapter(),
  plugins: r2Configured
    ? [
        s3Storage({
          collections: {
            media: {
              // A public bucket URL is used when one is configured; otherwise
              // Payload serves the file itself.
              ...(r2PublicUrl
                ? {
                    generateFileURL: ({ filename, prefix }) =>
                      [r2PublicUrl, prefix, filename].filter(Boolean).join('/'),
                  }
                : {}),
            },
          },
          bucket: process.env.R2_BUCKET as string,
          config: {
            endpoint: r2Endpoint,
            // R2 ignores the region but the S3 client requires one.
            region: 'auto',
            credentials: {
              accessKeyId: process.env.R2_ACCESS_KEY_ID as string,
              secretAccessKey: process.env.R2_SECRET_ACCESS_KEY as string,
            },
          },
        }),
      ]
    : [],
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  graphQL: {
    disablePlaygroundInProduction: true,
  },
  telemetry: false,
});

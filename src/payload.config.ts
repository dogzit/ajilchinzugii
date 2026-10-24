import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { postgresAdapter } from '@payloadcms/db-postgres';
import { lexicalEditor } from '@payloadcms/richtext-lexical';
import { s3Storage } from '@payloadcms/storage-s3';
import { buildConfig } from 'payload';
import sharp from 'sharp';
import { Media } from './payload/collections/media';
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
const connectionString = isMigrating
  ? (process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL)
  : process.env.DATABASE_URL;

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

export default buildConfig({
  serverURL: process.env.NEXT_PUBLIC_SITE_URL,
  secret: process.env.PAYLOAD_SECRET ?? '',
  admin: {
    user: Users.slug,
    importMap: { baseDir: path.resolve(dirname) },
    meta: {
      titleSuffix: ' — Ажилчин Зөгий',
      description:
        'Ажилчин Зөгий — агуулгын удирдлага / content management for Ajilchin Zögii',
    },
    components: {
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
  db: postgresAdapter({
    pool: { connectionString },
    // Never let the app alter the schema on boot — production changes go
    // through a generated, reviewed migration.
    push: false,
    migrationDir: path.resolve(dirname, 'migrations'),
  }),
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

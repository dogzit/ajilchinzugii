import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/**
 * `team.name` becomes localized, so a Mongolian name can be written in
 * Cyrillic for Mongolian readers and in latin for English ones.
 *
 * Payload generated this as `ADD COLUMN ... NOT NULL` followed by
 * `DROP COLUMN "team"."name"`, which is wrong twice over: Postgres refuses a
 * NOT NULL column on a table that already has rows, and the drop would have
 * thrown the existing names away before anything copied them. Written out by
 * hand instead — the column arrives nullable, every locale row inherits the
 * name it had, and only then does it become NOT NULL and the old column go.
 *
 * The slug is deliberately untouched: a person's address must not change
 * with the language the reader is in.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "team_locales" ADD COLUMN "name" varchar;

    UPDATE "team_locales" tl
    SET "name" = t."name"
    FROM "team" t
    WHERE tl."_parent_id" = t."id" AND tl."name" IS NULL;

    ALTER TABLE "team_locales" ALTER COLUMN "name" SET NOT NULL;
    ALTER TABLE "team" DROP COLUMN "name";
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "team" ADD COLUMN "name" varchar;

    -- Localized back to one value: Mongolian is the site's first language,
    -- so that is the one that survives.
    UPDATE "team" t
    SET "name" = tl."name"
    FROM "team_locales" tl
    WHERE tl."_parent_id" = t."id" AND tl."_locale" = 'mn';

    ALTER TABLE "team" ALTER COLUMN "name" SET NOT NULL;
    ALTER TABLE "team_locales" DROP COLUMN "name";
  `)
}

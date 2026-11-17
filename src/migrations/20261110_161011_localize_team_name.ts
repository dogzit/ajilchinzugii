import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/**
 * `team.name` becomes localized, so a Mongolian name can be written in
 * Cyrillic for Mongolian readers and in latin for English ones.
 *
 * **This migration only adds.** It is the expand half of an expand/contract
 * pair: `team.name` stays where it is, merely nullable, and
 * `20261117_221500_drop_team_name` removes it afterwards.
 *
 * The split exists because one Neon database serves the live site and this
 * branch at once. Dropping the column in one step would mean the deployed
 * code lost `team.name` the instant the migration ran and before the new
 * build replaced it — every /about and /team/* request failing for the
 * minutes in between. With both columns present, old code and new code are
 * each satisfied, so the deploy can happen whenever it happens.
 *
 * Run this, deploy, confirm the team pages render, and only then run the drop.
 *
 * (Payload generated the original as `ADD COLUMN ... NOT NULL` followed by
 * `DROP COLUMN "team"."name"`, which was wrong twice over: Postgres refuses a
 * NOT NULL column on a table that already has rows, and the drop would have
 * thrown the existing names away before anything copied them.)
 *
 * The slug is deliberately untouched: a person's address must not change
 * with the language the reader is in.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "team_locales" ADD COLUMN "name" varchar;

    -- Every locale row inherits the name the person already had. The seed
    -- overwrites it per language afterwards; this is only so that nothing is
    -- ever nameless in between.
    UPDATE "team_locales" tl
    SET "name" = t."name"
    FROM "team" t
    WHERE tl."_parent_id" = t."id" AND tl."name" IS NULL;

    ALTER TABLE "team_locales" ALTER COLUMN "name" SET NOT NULL;

    -- Kept, but no longer required: the new code does not write it, so a
    -- member created from the admin after this point would otherwise fail
    -- the NOT NULL check on a column it has never heard of.
    ALTER TABLE "team" ALTER COLUMN "name" DROP NOT NULL;
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
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

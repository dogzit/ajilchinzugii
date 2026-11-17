import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/**
 * The contract half of the pair begun in
 * `20261110_161011_localize_team_name`: `team.name` has been superseded by
 * `team_locales.name` and is now removed.
 *
 * **Run this only once the deployed site reads the localized column.** Until
 * then the old column is what the live build is still selecting, and
 * dropping it takes /about and every /team/* page down with it. The expand
 * migration left both in place precisely so that this could wait.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "team" DROP COLUMN "name";
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "team" ADD COLUMN "name" varchar;

    -- Mongolian is the site's first language, so that is the name that
    -- comes back into the single column.
    UPDATE "team" t
    SET "name" = tl."name"
    FROM "team_locales" tl
    WHERE tl."_parent_id" = t."id" AND tl."_locale" = 'mn';
  `)
}

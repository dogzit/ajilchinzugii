import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/**
 * `slug` on team members, added to a table that already has rows.
 *
 * Payload generated this as a single `ADD COLUMN ... NOT NULL`, which
 * Postgres refuses on a non-empty table. So the column arrives nullable, is
 * filled from each member's name, and only then becomes NOT NULL with its
 * unique index. Written out rather than left to the seed script, because the
 * schema has to stand up on its own wherever it is applied.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "team" ADD COLUMN "slug" varchar;

    -- Lowercase the name and reduce anything that is not a latin letter or
    -- digit to a single hyphen. A name written in Cyrillic reduces to
    -- nothing, so those fall back to the row id and an editor renames them.
    UPDATE "team"
    SET "slug" = COALESCE(
      NULLIF(
        trim(both '-' from regexp_replace(lower("name"), '[^a-z0-9]+', '-', 'g')),
        ''
      ),
      'member-' || "id"
    )
    WHERE "slug" IS NULL;

    -- Two members with the same name would collide on a unique index.
    UPDATE "team" t
    SET "slug" = t."slug" || '-' || t."id"
    WHERE EXISTS (
      SELECT 1 FROM "team" o WHERE o."slug" = t."slug" AND o."id" <> t."id"
    );

    CREATE UNIQUE INDEX "team_slug_idx" ON "team" USING btree ("slug");
    ALTER TABLE "team" ALTER COLUMN "slug" SET NOT NULL;
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DROP INDEX "team_slug_idx";
    ALTER TABLE "team" DROP COLUMN "slug";
  `)
}

import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "papers_findings_locales" ADD COLUMN "value" varchar;
  ALTER TABLE "_papers_v_version_findings_locales" ADD COLUMN "value" varchar;
  ALTER TABLE "papers_findings" DROP COLUMN "value";
  ALTER TABLE "_papers_v_version_findings" DROP COLUMN "value";`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "papers_findings" ADD COLUMN "value" varchar;
  ALTER TABLE "_papers_v_version_findings" ADD COLUMN "value" varchar;
  ALTER TABLE "papers_findings_locales" DROP COLUMN "value";
  ALTER TABLE "_papers_v_version_findings_locales" DROP COLUMN "value";`)
}

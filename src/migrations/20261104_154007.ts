import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "papers_locales" ADD COLUMN "citations_apa" varchar;
  ALTER TABLE "papers_locales" ADD COLUMN "citations_bibtex" varchar;
  ALTER TABLE "_papers_v_locales" ADD COLUMN "version_citations_apa" varchar;
  ALTER TABLE "_papers_v_locales" ADD COLUMN "version_citations_bibtex" varchar;
  ALTER TABLE "papers" DROP COLUMN "citations_apa";
  ALTER TABLE "papers" DROP COLUMN "citations_bibtex";
  ALTER TABLE "_papers_v" DROP COLUMN "version_citations_apa";
  ALTER TABLE "_papers_v" DROP COLUMN "version_citations_bibtex";`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "papers" ADD COLUMN "citations_apa" varchar;
  ALTER TABLE "papers" ADD COLUMN "citations_bibtex" varchar;
  ALTER TABLE "_papers_v" ADD COLUMN "version_citations_apa" varchar;
  ALTER TABLE "_papers_v" ADD COLUMN "version_citations_bibtex" varchar;
  ALTER TABLE "papers_locales" DROP COLUMN "citations_apa";
  ALTER TABLE "papers_locales" DROP COLUMN "citations_bibtex";
  ALTER TABLE "_papers_v_locales" DROP COLUMN "version_citations_apa";
  ALTER TABLE "_papers_v_locales" DROP COLUMN "version_citations_bibtex";`)
}

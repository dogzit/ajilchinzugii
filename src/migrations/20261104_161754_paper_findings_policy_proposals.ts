import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "papers_findings" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"value" varchar
  );
  
  CREATE TABLE "papers_findings_locales" (
  	"label" varchar,
  	"source" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "papers_comparison_rows" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"group_a" numeric,
  	"group_b" numeric
  );
  
  CREATE TABLE "papers_comparison_rows_locales" (
  	"label" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "_papers_v_version_findings" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"value" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_papers_v_version_findings_locales" (
  	"label" varchar,
  	"source" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_papers_v_version_comparison_rows" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"group_a" numeric,
  	"group_b" numeric,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_papers_v_version_comparison_rows_locales" (
  	"label" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "policy_proposals" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "policy_proposals_locales" (
  	"change" varchar,
  	"gap" varchar,
  	"evidence" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "_policy_v_version_proposals" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_policy_v_version_proposals_locales" (
  	"change" varchar,
  	"gap" varchar,
  	"evidence" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  ALTER TABLE "papers_locales" ADD COLUMN "comparison_title" varchar;
  ALTER TABLE "papers_locales" ADD COLUMN "comparison_group_a_label" varchar;
  ALTER TABLE "papers_locales" ADD COLUMN "comparison_group_b_label" varchar;
  ALTER TABLE "papers_locales" ADD COLUMN "comparison_note" varchar;
  ALTER TABLE "_papers_v_locales" ADD COLUMN "version_comparison_title" varchar;
  ALTER TABLE "_papers_v_locales" ADD COLUMN "version_comparison_group_a_label" varchar;
  ALTER TABLE "_papers_v_locales" ADD COLUMN "version_comparison_group_b_label" varchar;
  ALTER TABLE "_papers_v_locales" ADD COLUMN "version_comparison_note" varchar;
  ALTER TABLE "policy" ADD COLUMN "based_on_id" integer;
  ALTER TABLE "_policy_v" ADD COLUMN "version_based_on_id" integer;
  ALTER TABLE "papers_findings" ADD CONSTRAINT "papers_findings_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."papers"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "papers_findings_locales" ADD CONSTRAINT "papers_findings_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."papers_findings"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "papers_comparison_rows" ADD CONSTRAINT "papers_comparison_rows_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."papers"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "papers_comparison_rows_locales" ADD CONSTRAINT "papers_comparison_rows_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."papers_comparison_rows"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_papers_v_version_findings" ADD CONSTRAINT "_papers_v_version_findings_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_papers_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_papers_v_version_findings_locales" ADD CONSTRAINT "_papers_v_version_findings_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_papers_v_version_findings"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_papers_v_version_comparison_rows" ADD CONSTRAINT "_papers_v_version_comparison_rows_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_papers_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_papers_v_version_comparison_rows_locales" ADD CONSTRAINT "_papers_v_version_comparison_rows_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_papers_v_version_comparison_rows"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "policy_proposals" ADD CONSTRAINT "policy_proposals_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."policy"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "policy_proposals_locales" ADD CONSTRAINT "policy_proposals_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."policy_proposals"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_policy_v_version_proposals" ADD CONSTRAINT "_policy_v_version_proposals_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_policy_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_policy_v_version_proposals_locales" ADD CONSTRAINT "_policy_v_version_proposals_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_policy_v_version_proposals"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "papers_findings_order_idx" ON "papers_findings" USING btree ("_order");
  CREATE INDEX "papers_findings_parent_id_idx" ON "papers_findings" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "papers_findings_locales_locale_parent_id_unique" ON "papers_findings_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "papers_findings_locales_parent_id_idx" ON "papers_findings_locales" USING btree ("_parent_id");
  CREATE INDEX "papers_comparison_rows_order_idx" ON "papers_comparison_rows" USING btree ("_order");
  CREATE INDEX "papers_comparison_rows_parent_id_idx" ON "papers_comparison_rows" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "papers_comparison_rows_locales_locale_parent_id_unique" ON "papers_comparison_rows_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "papers_comparison_rows_locales_parent_id_idx" ON "papers_comparison_rows_locales" USING btree ("_parent_id");
  CREATE INDEX "_papers_v_version_findings_order_idx" ON "_papers_v_version_findings" USING btree ("_order");
  CREATE INDEX "_papers_v_version_findings_parent_id_idx" ON "_papers_v_version_findings" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "_papers_v_version_findings_locales_locale_parent_id_unique" ON "_papers_v_version_findings_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_papers_v_version_findings_locales_parent_id_idx" ON "_papers_v_version_findings_locales" USING btree ("_parent_id");
  CREATE INDEX "_papers_v_version_comparison_rows_order_idx" ON "_papers_v_version_comparison_rows" USING btree ("_order");
  CREATE INDEX "_papers_v_version_comparison_rows_parent_id_idx" ON "_papers_v_version_comparison_rows" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "_papers_v_version_comparison_rows_locales_locale_parent_id_u" ON "_papers_v_version_comparison_rows_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_papers_v_version_comparison_rows_locales_parent_id_idx" ON "_papers_v_version_comparison_rows_locales" USING btree ("_parent_id");
  CREATE INDEX "policy_proposals_order_idx" ON "policy_proposals" USING btree ("_order");
  CREATE INDEX "policy_proposals_parent_id_idx" ON "policy_proposals" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "policy_proposals_locales_locale_parent_id_unique" ON "policy_proposals_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "policy_proposals_locales_parent_id_idx" ON "policy_proposals_locales" USING btree ("_parent_id");
  CREATE INDEX "_policy_v_version_proposals_order_idx" ON "_policy_v_version_proposals" USING btree ("_order");
  CREATE INDEX "_policy_v_version_proposals_parent_id_idx" ON "_policy_v_version_proposals" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "_policy_v_version_proposals_locales_locale_parent_id_unique" ON "_policy_v_version_proposals_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_policy_v_version_proposals_locales_parent_id_idx" ON "_policy_v_version_proposals_locales" USING btree ("_parent_id");
  ALTER TABLE "policy" ADD CONSTRAINT "policy_based_on_id_papers_id_fk" FOREIGN KEY ("based_on_id") REFERENCES "public"."papers"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_policy_v" ADD CONSTRAINT "_policy_v_version_based_on_id_papers_id_fk" FOREIGN KEY ("version_based_on_id") REFERENCES "public"."papers"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "policy_based_on_idx" ON "policy" USING btree ("based_on_id");
  CREATE INDEX "_policy_v_version_version_based_on_idx" ON "_policy_v" USING btree ("version_based_on_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "papers_findings" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "papers_findings_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "papers_comparison_rows" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "papers_comparison_rows_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_papers_v_version_findings" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_papers_v_version_findings_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_papers_v_version_comparison_rows" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_papers_v_version_comparison_rows_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "policy_proposals" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "policy_proposals_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_policy_v_version_proposals" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_policy_v_version_proposals_locales" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "papers_findings" CASCADE;
  DROP TABLE "papers_findings_locales" CASCADE;
  DROP TABLE "papers_comparison_rows" CASCADE;
  DROP TABLE "papers_comparison_rows_locales" CASCADE;
  DROP TABLE "_papers_v_version_findings" CASCADE;
  DROP TABLE "_papers_v_version_findings_locales" CASCADE;
  DROP TABLE "_papers_v_version_comparison_rows" CASCADE;
  DROP TABLE "_papers_v_version_comparison_rows_locales" CASCADE;
  DROP TABLE "policy_proposals" CASCADE;
  DROP TABLE "policy_proposals_locales" CASCADE;
  DROP TABLE "_policy_v_version_proposals" CASCADE;
  DROP TABLE "_policy_v_version_proposals_locales" CASCADE;
  ALTER TABLE "policy" DROP CONSTRAINT "policy_based_on_id_papers_id_fk";
  
  ALTER TABLE "_policy_v" DROP CONSTRAINT "_policy_v_version_based_on_id_papers_id_fk";
  
  DROP INDEX "policy_based_on_idx";
  DROP INDEX "_policy_v_version_version_based_on_idx";
  ALTER TABLE "papers_locales" DROP COLUMN "comparison_title";
  ALTER TABLE "papers_locales" DROP COLUMN "comparison_group_a_label";
  ALTER TABLE "papers_locales" DROP COLUMN "comparison_group_b_label";
  ALTER TABLE "papers_locales" DROP COLUMN "comparison_note";
  ALTER TABLE "_papers_v_locales" DROP COLUMN "version_comparison_title";
  ALTER TABLE "_papers_v_locales" DROP COLUMN "version_comparison_group_a_label";
  ALTER TABLE "_papers_v_locales" DROP COLUMN "version_comparison_group_b_label";
  ALTER TABLE "_papers_v_locales" DROP COLUMN "version_comparison_note";
  ALTER TABLE "policy" DROP COLUMN "based_on_id";
  ALTER TABLE "_policy_v" DROP COLUMN "version_based_on_id";`)
}

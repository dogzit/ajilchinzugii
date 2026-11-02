import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "methodology_measures_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "methodology_measures_items_locales" (
  	"label" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "methodology_measures" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "methodology_measures_locales" (
  	"category" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "_methodology_v_version_measures_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_methodology_v_version_measures_items_locales" (
  	"label" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_methodology_v_version_measures" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_methodology_v_version_measures_locales" (
  	"category" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  ALTER TABLE "site" DROP CONSTRAINT "site_logo_id_media_id_fk";
  
  DROP INDEX "site_logo_idx";
  ALTER TABLE "methodology_measures_items" ADD CONSTRAINT "methodology_measures_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."methodology_measures"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "methodology_measures_items_locales" ADD CONSTRAINT "methodology_measures_items_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."methodology_measures_items"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "methodology_measures" ADD CONSTRAINT "methodology_measures_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."methodology"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "methodology_measures_locales" ADD CONSTRAINT "methodology_measures_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."methodology_measures"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_methodology_v_version_measures_items" ADD CONSTRAINT "_methodology_v_version_measures_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_methodology_v_version_measures"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_methodology_v_version_measures_items_locales" ADD CONSTRAINT "_methodology_v_version_measures_items_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_methodology_v_version_measures_items"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_methodology_v_version_measures" ADD CONSTRAINT "_methodology_v_version_measures_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_methodology_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_methodology_v_version_measures_locales" ADD CONSTRAINT "_methodology_v_version_measures_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_methodology_v_version_measures"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "methodology_measures_items_order_idx" ON "methodology_measures_items" USING btree ("_order");
  CREATE INDEX "methodology_measures_items_parent_id_idx" ON "methodology_measures_items" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "methodology_measures_items_locales_locale_parent_id_unique" ON "methodology_measures_items_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "methodology_measures_items_locales_parent_id_idx" ON "methodology_measures_items_locales" USING btree ("_parent_id");
  CREATE INDEX "methodology_measures_order_idx" ON "methodology_measures" USING btree ("_order");
  CREATE INDEX "methodology_measures_parent_id_idx" ON "methodology_measures" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "methodology_measures_locales_locale_parent_id_unique" ON "methodology_measures_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "methodology_measures_locales_parent_id_idx" ON "methodology_measures_locales" USING btree ("_parent_id");
  CREATE INDEX "_methodology_v_version_measures_items_order_idx" ON "_methodology_v_version_measures_items" USING btree ("_order");
  CREATE INDEX "_methodology_v_version_measures_items_parent_id_idx" ON "_methodology_v_version_measures_items" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "_methodology_v_version_measures_items_locales_locale_parent_" ON "_methodology_v_version_measures_items_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_methodology_v_version_measures_items_locales_parent_id_idx" ON "_methodology_v_version_measures_items_locales" USING btree ("_parent_id");
  CREATE INDEX "_methodology_v_version_measures_order_idx" ON "_methodology_v_version_measures" USING btree ("_order");
  CREATE INDEX "_methodology_v_version_measures_parent_id_idx" ON "_methodology_v_version_measures" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "_methodology_v_version_measures_locales_locale_parent_id_uni" ON "_methodology_v_version_measures_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_methodology_v_version_measures_locales_parent_id_idx" ON "_methodology_v_version_measures_locales" USING btree ("_parent_id");
  ALTER TABLE "site" DROP COLUMN "logo_id";`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "methodology_measures_items" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "methodology_measures_items_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "methodology_measures" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "methodology_measures_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_methodology_v_version_measures_items" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_methodology_v_version_measures_items_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_methodology_v_version_measures" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_methodology_v_version_measures_locales" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "methodology_measures_items" CASCADE;
  DROP TABLE "methodology_measures_items_locales" CASCADE;
  DROP TABLE "methodology_measures" CASCADE;
  DROP TABLE "methodology_measures_locales" CASCADE;
  DROP TABLE "_methodology_v_version_measures_items" CASCADE;
  DROP TABLE "_methodology_v_version_measures_items_locales" CASCADE;
  DROP TABLE "_methodology_v_version_measures" CASCADE;
  DROP TABLE "_methodology_v_version_measures_locales" CASCADE;
  ALTER TABLE "site" ADD COLUMN "logo_id" integer;
  ALTER TABLE "site" ADD CONSTRAINT "site_logo_id_media_id_fk" FOREIGN KEY ("logo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "site_logo_idx" ON "site" USING btree ("logo_id");`)
}

import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "team_profiles" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"url" varchar NOT NULL
  );
  
  CREATE TABLE "team_profiles_locales" (
  	"label" varchar NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  ALTER TABLE "team_profiles" ADD CONSTRAINT "team_profiles_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."team"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "team_profiles_locales" ADD CONSTRAINT "team_profiles_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."team_profiles"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "team_profiles_order_idx" ON "team_profiles" USING btree ("_order");
  CREATE INDEX "team_profiles_parent_id_idx" ON "team_profiles" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "team_profiles_locales_locale_parent_id_unique" ON "team_profiles_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "team_profiles_locales_parent_id_idx" ON "team_profiles_locales" USING btree ("_parent_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "team_profiles" CASCADE;
  DROP TABLE "team_profiles_locales" CASCADE;`)
}

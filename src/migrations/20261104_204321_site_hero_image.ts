import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "site" ADD COLUMN "hero_image_id" integer;
  ALTER TABLE "site" ADD CONSTRAINT "site_hero_image_id_media_id_fk" FOREIGN KEY ("hero_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "site_hero_image_idx" ON "site" USING btree ("hero_image_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "site" DROP CONSTRAINT "site_hero_image_id_media_id_fk";
  
  DROP INDEX "site_hero_image_idx";
  ALTER TABLE "site" DROP COLUMN "hero_image_id";`)
}

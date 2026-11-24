import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_members_age_band" AS ENUM('13_14', '15_17', '18_24');
  CREATE TYPE "public"."enum_members_aimag" AS ENUM('ulaanbaatar', 'arkhangai', 'bayan_ulgii', 'bayankhongor', 'bulgan', 'govi_altai', 'govisumber', 'darkhan_uul', 'dornogovi', 'dornod', 'dundgovi', 'zavkhan', 'orkhon', 'uvurkhangai', 'umnugovi', 'sukhbaatar', 'selenge', 'tuv', 'uvs', 'khovd', 'khuvsgul', 'khentii');
  CREATE TYPE "public"."enum_saved_ratings_kind" AS ENUM('contract', 'cv');
  CREATE TYPE "public"."enum_saved_ratings_verdict" AS ENUM('red', 'yellow', 'green');
  CREATE TABLE "members" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"clerk_user_id" varchar NOT NULL,
  	"age_band" "enum_members_age_band" NOT NULL,
  	"guardian_consent" boolean DEFAULT false,
  	"guardian_consent_at" timestamp(3) with time zone,
  	"target_job" varchar,
  	"aimag" "enum_members_aimag",
  	"cv_profile" jsonb,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "saved_ratings" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"member_id" integer NOT NULL,
  	"kind" "enum_saved_ratings_kind" NOT NULL,
  	"rule_set_version" varchar NOT NULL,
  	"verdict" "enum_saved_ratings_verdict" NOT NULL,
  	"score" numeric NOT NULL,
  	"results" jsonb NOT NULL,
  	"rated_on" timestamp(3) with time zone NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "members_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "saved_ratings_id" integer;
  ALTER TABLE "saved_ratings" ADD CONSTRAINT "saved_ratings_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE set null ON UPDATE no action;
  CREATE UNIQUE INDEX "members_clerk_user_id_idx" ON "members" USING btree ("clerk_user_id");
  CREATE INDEX "members_updated_at_idx" ON "members" USING btree ("updated_at");
  CREATE INDEX "members_created_at_idx" ON "members" USING btree ("created_at");
  CREATE INDEX "saved_ratings_member_idx" ON "saved_ratings" USING btree ("member_id");
  CREATE INDEX "saved_ratings_updated_at_idx" ON "saved_ratings" USING btree ("updated_at");
  CREATE INDEX "saved_ratings_created_at_idx" ON "saved_ratings" USING btree ("created_at");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_members_fk" FOREIGN KEY ("members_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_saved_ratings_fk" FOREIGN KEY ("saved_ratings_id") REFERENCES "public"."saved_ratings"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_members_id_idx" ON "payload_locked_documents_rels" USING btree ("members_id");
  CREATE INDEX "payload_locked_documents_rels_saved_ratings_id_idx" ON "payload_locked_documents_rels" USING btree ("saved_ratings_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "members" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "saved_ratings" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "members" CASCADE;
  DROP TABLE "saved_ratings" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_members_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_saved_ratings_fk";
  
  DROP INDEX "payload_locked_documents_rels_members_id_idx";
  DROP INDEX "payload_locked_documents_rels_saved_ratings_id_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "members_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "saved_ratings_id";
  DROP TYPE "public"."enum_members_age_band";
  DROP TYPE "public"."enum_members_aimag";
  DROP TYPE "public"."enum_saved_ratings_kind";
  DROP TYPE "public"."enum_saved_ratings_verdict";`)
}

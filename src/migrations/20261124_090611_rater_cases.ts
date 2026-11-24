import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_cases_priority" AS ENUM('P1', 'P2', 'P3');
  CREATE TYPE "public"."enum_cases_status" AS ENUM('new', 'contacted', 'in_progress', 'referred', 'closed');
  CREATE TYPE "public"."enum_cases_outcome" AS ENUM('fixed_with_employer', 'referred_labour_inspection', 'referred_cmtu_legal_aid', 'no_response', 'other');
  CREATE TYPE "public"."enum_cases_contact_method" AS ENUM('phone', 'facebook');
  CREATE TYPE "public"."enum_cases_best_time" AS ENUM('morning', 'day', 'evening');
  CREATE TYPE "public"."enum_case_access_log_action" AS ENUM('view');
  CREATE TYPE "public"."enum_rater_stats_result" AS ENUM('green', 'yellow', 'red');
  ALTER TYPE "public"."enum_users_role" ADD VALUE 'caseworker';
  CREATE TABLE "cases" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"case_id" varchar NOT NULL,
  	"priority" "enum_cases_priority" NOT NULL,
  	"deadline" timestamp(3) with time zone NOT NULL,
  	"over_capacity" boolean DEFAULT false,
  	"week_key" varchar NOT NULL,
  	"status" "enum_cases_status" DEFAULT 'new' NOT NULL,
  	"outcome" "enum_cases_outcome",
  	"caseworker_id" integer,
  	"failed_rules" jsonb NOT NULL,
  	"age_band" varchar,
  	"job_category" varchar,
  	"contact_method" "enum_cases_contact_method" NOT NULL,
  	"contact" varchar NOT NULL,
  	"best_time" "enum_cases_best_time",
  	"description" varchar,
  	"consent_to_contact" boolean DEFAULT false NOT NULL,
  	"store_file" boolean DEFAULT false,
  	"guardian_consent" boolean DEFAULT false,
  	"guardian_consent_at" timestamp(3) with time zone,
  	"guardian_confirmed_on_call" boolean DEFAULT false,
  	"file_key" varchar,
  	"file_delete_at" timestamp(3) with time zone,
  	"member_clerk_id" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "case_access_log" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"case_id" integer,
  	"user_id" integer NOT NULL,
  	"action" "enum_case_access_log_action" NOT NULL,
  	"at" timestamp(3) with time zone NOT NULL
  );
  
  CREATE TABLE "rater_stats" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"rule_id" varchar NOT NULL,
  	"result" "enum_rater_stats_result" NOT NULL,
  	"rule_set_version" varchar NOT NULL,
  	"month" varchar NOT NULL,
  	"age_band" varchar NOT NULL,
  	"job_category" varchar NOT NULL,
  	"employer_kind" varchar NOT NULL,
  	"aimag" varchar,
  	"count" numeric NOT NULL
  );
  
  ALTER TABLE "users" ADD COLUMN "on_duty" boolean DEFAULT false;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "cases_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "case_access_log_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "rater_stats_id" integer;
  ALTER TABLE "cases" ADD CONSTRAINT "cases_caseworker_id_users_id_fk" FOREIGN KEY ("caseworker_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "case_access_log" ADD CONSTRAINT "case_access_log_case_id_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."cases"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "case_access_log" ADD CONSTRAINT "case_access_log_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  CREATE UNIQUE INDEX "cases_case_id_idx" ON "cases" USING btree ("case_id");
  CREATE INDEX "cases_week_key_idx" ON "cases" USING btree ("week_key");
  CREATE INDEX "cases_caseworker_idx" ON "cases" USING btree ("caseworker_id");
  CREATE INDEX "cases_member_clerk_id_idx" ON "cases" USING btree ("member_clerk_id");
  CREATE INDEX "cases_updated_at_idx" ON "cases" USING btree ("updated_at");
  CREATE INDEX "cases_created_at_idx" ON "cases" USING btree ("created_at");
  CREATE INDEX "case_access_log_case_idx" ON "case_access_log" USING btree ("case_id");
  CREATE INDEX "case_access_log_user_idx" ON "case_access_log" USING btree ("user_id");
  CREATE INDEX "rater_stats_rule_id_idx" ON "rater_stats" USING btree ("rule_id");
  CREATE INDEX "rater_stats_month_idx" ON "rater_stats" USING btree ("month");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_cases_fk" FOREIGN KEY ("cases_id") REFERENCES "public"."cases"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_case_access_log_fk" FOREIGN KEY ("case_access_log_id") REFERENCES "public"."case_access_log"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_rater_stats_fk" FOREIGN KEY ("rater_stats_id") REFERENCES "public"."rater_stats"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_cases_id_idx" ON "payload_locked_documents_rels" USING btree ("cases_id");
  CREATE INDEX "payload_locked_documents_rels_case_access_log_id_idx" ON "payload_locked_documents_rels" USING btree ("case_access_log_id");
  CREATE INDEX "payload_locked_documents_rels_rater_stats_id_idx" ON "payload_locked_documents_rels" USING btree ("rater_stats_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "cases" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "case_access_log" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "rater_stats" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "cases" CASCADE;
  DROP TABLE "case_access_log" CASCADE;
  DROP TABLE "rater_stats" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_cases_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_case_access_log_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_rater_stats_fk";
  
  ALTER TABLE "users" ALTER COLUMN "role" SET DATA TYPE text;
  ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'editor'::text;
  DROP TYPE "public"."enum_users_role";
  CREATE TYPE "public"."enum_users_role" AS ENUM('admin', 'editor');
  ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'editor'::"public"."enum_users_role";
  ALTER TABLE "users" ALTER COLUMN "role" SET DATA TYPE "public"."enum_users_role" USING "role"::"public"."enum_users_role";
  DROP INDEX "payload_locked_documents_rels_cases_id_idx";
  DROP INDEX "payload_locked_documents_rels_case_access_log_id_idx";
  DROP INDEX "payload_locked_documents_rels_rater_stats_id_idx";
  ALTER TABLE "users" DROP COLUMN "on_duty";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "cases_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "case_access_log_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "rater_stats_id";
  DROP TYPE "public"."enum_cases_priority";
  DROP TYPE "public"."enum_cases_status";
  DROP TYPE "public"."enum_cases_outcome";
  DROP TYPE "public"."enum_cases_contact_method";
  DROP TYPE "public"."enum_cases_best_time";
  DROP TYPE "public"."enum_case_access_log_action";
  DROP TYPE "public"."enum_rater_stats_result";`)
}

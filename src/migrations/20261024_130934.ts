import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres';

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."_locales" AS ENUM('mn', 'en');
  CREATE TYPE "public"."enum_papers_publication_status" AS ENUM('working-paper', 'preprint', 'under-review', 'published');
  CREATE TYPE "public"."enum_papers_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__papers_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__papers_v_published_locale" AS ENUM('mn', 'en');
  CREATE TYPE "public"."enum_media_subject" AS ENUM('none', 'adult-member', 'teen-member');
  CREATE TYPE "public"."enum_users_role" AS ENUM('admin', 'editor');
  CREATE TYPE "public"."enum_methodology_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__methodology_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__methodology_v_published_locale" AS ENUM('mn', 'en');
  CREATE TYPE "public"."enum_policy_history_status" AS ENUM('drafted', 'submitted', 'under-review', 'adopted', 'rejected');
  CREATE TYPE "public"."enum_policy_proposal_status" AS ENUM('drafted', 'submitted', 'under-review', 'adopted', 'rejected');
  CREATE TYPE "public"."enum_policy_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__policy_v_version_history_status" AS ENUM('drafted', 'submitted', 'under-review', 'adopted', 'rejected');
  CREATE TYPE "public"."enum__policy_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__policy_v_published_locale" AS ENUM('mn', 'en');
  CREATE TABLE "papers_authors" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"name" varchar
  );
  
  CREATE TABLE "papers" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"slug" varchar,
  	"year" numeric,
  	"venue" varchar,
  	"doi" varchar,
  	"status" "enum_papers_publication_status" DEFAULT 'working-paper',
  	"pdf_id" integer,
  	"code_url" varchar,
  	"data_url" varchar,
  	"citations_apa" varchar,
  	"citations_bibtex" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "enum_papers_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "papers_locales" (
  	"title" varchar,
  	"abstract" jsonb,
  	"seo_meta_title" varchar,
  	"seo_meta_description" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_papers_v_version_authors" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_papers_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_slug" varchar,
  	"version_year" numeric,
  	"version_venue" varchar,
  	"version_doi" varchar,
  	"version_status" "enum_papers_publication_status" DEFAULT 'working-paper',
  	"version_pdf_id" integer,
  	"version_code_url" varchar,
  	"version_data_url" varchar,
  	"version_citations_apa" varchar,
  	"version_citations_bibtex" varchar,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "enum__papers_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"snapshot" boolean,
  	"published_locale" "enum__papers_v_published_locale",
  	"latest" boolean
  );
  
  CREATE TABLE "_papers_v_locales" (
  	"version_title" varchar,
  	"version_abstract" jsonb,
  	"version_seo_meta_title" varchar,
  	"version_seo_meta_description" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "team" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"photo_id" integer,
  	"confirmed_adult18_plus" boolean DEFAULT false NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "team_locales" (
  	"role" varchar NOT NULL,
  	"bio" jsonb,
  	"seo_meta_title" varchar,
  	"seo_meta_description" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "partners" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"logo_id" integer,
  	"url" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "partners_locales" (
  	"seo_meta_title" varchar,
  	"seo_meta_description" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "media" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"alt_mn" varchar NOT NULL,
  	"alt_en" varchar NOT NULL,
  	"subject" "enum_media_subject" DEFAULT 'none' NOT NULL,
  	"consent_teen" boolean,
  	"consent_parent" boolean,
  	"consent_date" timestamp(3) with time zone,
  	"consent_record_ref" varchar,
  	"_objectkey" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"url" varchar,
  	"thumbnail_u_r_l" varchar,
  	"filename" varchar,
  	"mime_type" varchar,
  	"filesize" numeric,
  	"width" numeric,
  	"height" numeric,
  	"focal_x" numeric,
  	"focal_y" numeric,
  	"sizes_webp480_url" varchar,
  	"sizes_webp480_width" numeric,
  	"sizes_webp480_height" numeric,
  	"sizes_webp480_mime_type" varchar,
  	"sizes_webp480_filesize" numeric,
  	"sizes_webp480_filename" varchar,
  	"sizes_webp960_url" varchar,
  	"sizes_webp960_width" numeric,
  	"sizes_webp960_height" numeric,
  	"sizes_webp960_mime_type" varchar,
  	"sizes_webp960_filesize" numeric,
  	"sizes_webp960_filename" varchar,
  	"sizes_webp1600_url" varchar,
  	"sizes_webp1600_width" numeric,
  	"sizes_webp1600_height" numeric,
  	"sizes_webp1600_mime_type" varchar,
  	"sizes_webp1600_filesize" numeric,
  	"sizes_webp1600_filename" varchar,
  	"sizes_avif480_url" varchar,
  	"sizes_avif480_width" numeric,
  	"sizes_avif480_height" numeric,
  	"sizes_avif480_mime_type" varchar,
  	"sizes_avif480_filesize" numeric,
  	"sizes_avif480_filename" varchar,
  	"sizes_avif960_url" varchar,
  	"sizes_avif960_width" numeric,
  	"sizes_avif960_height" numeric,
  	"sizes_avif960_mime_type" varchar,
  	"sizes_avif960_filesize" numeric,
  	"sizes_avif960_filename" varchar,
  	"sizes_avif1600_url" varchar,
  	"sizes_avif1600_width" numeric,
  	"sizes_avif1600_height" numeric,
  	"sizes_avif1600_mime_type" varchar,
  	"sizes_avif1600_filesize" numeric,
  	"sizes_avif1600_filename" varchar
  );
  
  CREATE TABLE "media_locales" (
  	"seo_meta_title" varchar,
  	"seo_meta_description" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "users_sessions" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"created_at" timestamp(3) with time zone,
  	"expires_at" timestamp(3) with time zone NOT NULL
  );
  
  CREATE TABLE "users" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"role" "enum_users_role" DEFAULT 'editor' NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"email" varchar NOT NULL,
  	"reset_password_token" varchar,
  	"reset_password_expiration" timestamp(3) with time zone,
  	"salt" varchar,
  	"hash" varchar,
  	"reset_password_requested_at" timestamp(3) with time zone,
  	"login_attempts" numeric DEFAULT 0,
  	"lock_until" timestamp(3) with time zone
  );
  
  CREATE TABLE "payload_kv" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"key" varchar NOT NULL,
  	"data" jsonb NOT NULL
  );
  
  CREATE TABLE "payload_locked_documents" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"global_slug" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_locked_documents_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"papers_id" integer,
  	"team_id" integer,
  	"partners_id" integer,
  	"media_id" integer,
  	"users_id" integer
  );
  
  CREATE TABLE "payload_preferences" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"key" varchar,
  	"value" jsonb,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_preferences_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"users_id" integer
  );
  
  CREATE TABLE "payload_migrations" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"batch" numeric,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "site_social_links" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"platform" varchar NOT NULL,
  	"url" varchar NOT NULL
  );
  
  CREATE TABLE "site" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"contact_email" varchar NOT NULL,
  	"organization_founding_date" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "site_locales" (
  	"mission_line" varchar NOT NULL,
  	"organization_legal_name" varchar NOT NULL,
  	"organization_address_city" varchar,
  	"seo_meta_title" varchar,
  	"seo_meta_description" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "methodology_sources" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"url" varchar
  );
  
  CREATE TABLE "methodology_sources_locales" (
  	"title" varchar,
  	"note" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "methodology_definitions" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"anchor_id" varchar
  );
  
  CREATE TABLE "methodology_definitions_locales" (
  	"term" varchar,
  	"definition" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "methodology_counting_rules" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"anchor_id" varchar
  );
  
  CREATE TABLE "methodology_counting_rules_locales" (
  	"rule" varchar,
  	"detail" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "methodology_change_log" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"date" timestamp(3) with time zone
  );
  
  CREATE TABLE "methodology_change_log_locales" (
  	"summary" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "methodology" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"_status" "enum_methodology_status" DEFAULT 'draft',
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "methodology_locales" (
  	"limitations" jsonb,
  	"seo_meta_title" varchar,
  	"seo_meta_description" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_methodology_v_version_sources" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"url" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_methodology_v_version_sources_locales" (
  	"title" varchar,
  	"note" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_methodology_v_version_definitions" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"anchor_id" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_methodology_v_version_definitions_locales" (
  	"term" varchar,
  	"definition" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_methodology_v_version_counting_rules" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"anchor_id" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_methodology_v_version_counting_rules_locales" (
  	"rule" varchar,
  	"detail" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_methodology_v_version_change_log" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"date" timestamp(3) with time zone,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_methodology_v_version_change_log_locales" (
  	"summary" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_methodology_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"version__status" "enum__methodology_v_version_status" DEFAULT 'draft',
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"snapshot" boolean,
  	"published_locale" "enum__methodology_v_published_locale",
  	"latest" boolean
  );
  
  CREATE TABLE "_methodology_v_locales" (
  	"version_limitations" jsonb,
  	"version_seo_meta_title" varchar,
  	"version_seo_meta_description" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "policy_history" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"date" timestamp(3) with time zone,
  	"status" "enum_policy_history_status"
  );
  
  CREATE TABLE "policy_history_locales" (
  	"note" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "policy" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"status" "enum_policy_proposal_status" DEFAULT 'drafted',
  	"status_date" timestamp(3) with time zone,
  	"_status" "enum_policy_status" DEFAULT 'draft',
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "policy_locales" (
  	"summary" varchar,
  	"full_text" jsonb,
  	"seo_meta_title" varchar,
  	"seo_meta_description" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_policy_v_version_history" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"date" timestamp(3) with time zone,
  	"status" "enum__policy_v_version_history_status",
  	"_uuid" varchar
  );
  
  CREATE TABLE "_policy_v_version_history_locales" (
  	"note" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_policy_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"version_status" "enum_policy_proposal_status" DEFAULT 'drafted',
  	"version_status_date" timestamp(3) with time zone,
  	"version__status" "enum__policy_v_version_status" DEFAULT 'draft',
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"snapshot" boolean,
  	"published_locale" "enum__policy_v_published_locale",
  	"latest" boolean
  );
  
  CREATE TABLE "_policy_v_locales" (
  	"version_summary" varchar,
  	"version_full_text" jsonb,
  	"version_seo_meta_title" varchar,
  	"version_seo_meta_description" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "impact_snapshot" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"data" jsonb,
  	"fetched_at" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "impact_snapshot_locales" (
  	"seo_meta_title" varchar,
  	"seo_meta_description" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  ALTER TABLE "papers_authors" ADD CONSTRAINT "papers_authors_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."papers"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "papers" ADD CONSTRAINT "papers_pdf_id_media_id_fk" FOREIGN KEY ("pdf_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "papers_locales" ADD CONSTRAINT "papers_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."papers"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_papers_v_version_authors" ADD CONSTRAINT "_papers_v_version_authors_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_papers_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_papers_v" ADD CONSTRAINT "_papers_v_parent_id_papers_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."papers"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_papers_v" ADD CONSTRAINT "_papers_v_version_pdf_id_media_id_fk" FOREIGN KEY ("version_pdf_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_papers_v_locales" ADD CONSTRAINT "_papers_v_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_papers_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "team" ADD CONSTRAINT "team_photo_id_media_id_fk" FOREIGN KEY ("photo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "team_locales" ADD CONSTRAINT "team_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."team"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "partners" ADD CONSTRAINT "partners_logo_id_media_id_fk" FOREIGN KEY ("logo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "partners_locales" ADD CONSTRAINT "partners_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."partners"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "media_locales" ADD CONSTRAINT "media_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "users_sessions" ADD CONSTRAINT "users_sessions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."payload_locked_documents"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_papers_fk" FOREIGN KEY ("papers_id") REFERENCES "public"."papers"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_team_fk" FOREIGN KEY ("team_id") REFERENCES "public"."team"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_partners_fk" FOREIGN KEY ("partners_id") REFERENCES "public"."partners"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_media_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."payload_preferences"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "site_social_links" ADD CONSTRAINT "site_social_links_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."site"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "site_locales" ADD CONSTRAINT "site_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."site"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "methodology_sources" ADD CONSTRAINT "methodology_sources_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."methodology"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "methodology_sources_locales" ADD CONSTRAINT "methodology_sources_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."methodology_sources"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "methodology_definitions" ADD CONSTRAINT "methodology_definitions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."methodology"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "methodology_definitions_locales" ADD CONSTRAINT "methodology_definitions_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."methodology_definitions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "methodology_counting_rules" ADD CONSTRAINT "methodology_counting_rules_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."methodology"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "methodology_counting_rules_locales" ADD CONSTRAINT "methodology_counting_rules_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."methodology_counting_rules"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "methodology_change_log" ADD CONSTRAINT "methodology_change_log_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."methodology"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "methodology_change_log_locales" ADD CONSTRAINT "methodology_change_log_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."methodology_change_log"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "methodology_locales" ADD CONSTRAINT "methodology_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."methodology"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_methodology_v_version_sources" ADD CONSTRAINT "_methodology_v_version_sources_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_methodology_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_methodology_v_version_sources_locales" ADD CONSTRAINT "_methodology_v_version_sources_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_methodology_v_version_sources"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_methodology_v_version_definitions" ADD CONSTRAINT "_methodology_v_version_definitions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_methodology_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_methodology_v_version_definitions_locales" ADD CONSTRAINT "_methodology_v_version_definitions_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_methodology_v_version_definitions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_methodology_v_version_counting_rules" ADD CONSTRAINT "_methodology_v_version_counting_rules_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_methodology_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_methodology_v_version_counting_rules_locales" ADD CONSTRAINT "_methodology_v_version_counting_rules_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_methodology_v_version_counting_rules"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_methodology_v_version_change_log" ADD CONSTRAINT "_methodology_v_version_change_log_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_methodology_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_methodology_v_version_change_log_locales" ADD CONSTRAINT "_methodology_v_version_change_log_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_methodology_v_version_change_log"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_methodology_v_locales" ADD CONSTRAINT "_methodology_v_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_methodology_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "policy_history" ADD CONSTRAINT "policy_history_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."policy"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "policy_history_locales" ADD CONSTRAINT "policy_history_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."policy_history"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "policy_locales" ADD CONSTRAINT "policy_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."policy"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_policy_v_version_history" ADD CONSTRAINT "_policy_v_version_history_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_policy_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_policy_v_version_history_locales" ADD CONSTRAINT "_policy_v_version_history_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_policy_v_version_history"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_policy_v_locales" ADD CONSTRAINT "_policy_v_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_policy_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "impact_snapshot_locales" ADD CONSTRAINT "impact_snapshot_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."impact_snapshot"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "papers_authors_order_idx" ON "papers_authors" USING btree ("_order");
  CREATE INDEX "papers_authors_parent_id_idx" ON "papers_authors" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "papers_slug_idx" ON "papers" USING btree ("slug");
  CREATE INDEX "papers_pdf_idx" ON "papers" USING btree ("pdf_id");
  CREATE INDEX "papers_updated_at_idx" ON "papers" USING btree ("updated_at");
  CREATE INDEX "papers_created_at_idx" ON "papers" USING btree ("created_at");
  CREATE INDEX "papers__status_idx" ON "papers" USING btree ("_status");
  CREATE UNIQUE INDEX "papers_locales_locale_parent_id_unique" ON "papers_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "papers_locales_parent_id_idx" ON "papers_locales" USING btree ("_parent_id");
  CREATE INDEX "_papers_v_version_authors_order_idx" ON "_papers_v_version_authors" USING btree ("_order");
  CREATE INDEX "_papers_v_version_authors_parent_id_idx" ON "_papers_v_version_authors" USING btree ("_parent_id");
  CREATE INDEX "_papers_v_parent_idx" ON "_papers_v" USING btree ("parent_id");
  CREATE INDEX "_papers_v_version_version_slug_idx" ON "_papers_v" USING btree ("version_slug");
  CREATE INDEX "_papers_v_version_version_pdf_idx" ON "_papers_v" USING btree ("version_pdf_id");
  CREATE INDEX "_papers_v_version_version_updated_at_idx" ON "_papers_v" USING btree ("version_updated_at");
  CREATE INDEX "_papers_v_version_version_created_at_idx" ON "_papers_v" USING btree ("version_created_at");
  CREATE INDEX "_papers_v_version_version__status_idx" ON "_papers_v" USING btree ("version__status");
  CREATE INDEX "_papers_v_created_at_idx" ON "_papers_v" USING btree ("created_at");
  CREATE INDEX "_papers_v_updated_at_idx" ON "_papers_v" USING btree ("updated_at");
  CREATE INDEX "_papers_v_snapshot_idx" ON "_papers_v" USING btree ("snapshot");
  CREATE INDEX "_papers_v_published_locale_idx" ON "_papers_v" USING btree ("published_locale");
  CREATE INDEX "_papers_v_latest_idx" ON "_papers_v" USING btree ("latest");
  CREATE UNIQUE INDEX "_papers_v_locales_locale_parent_id_unique" ON "_papers_v_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_papers_v_locales_parent_id_idx" ON "_papers_v_locales" USING btree ("_parent_id");
  CREATE INDEX "team_photo_idx" ON "team" USING btree ("photo_id");
  CREATE INDEX "team_updated_at_idx" ON "team" USING btree ("updated_at");
  CREATE INDEX "team_created_at_idx" ON "team" USING btree ("created_at");
  CREATE UNIQUE INDEX "team_locales_locale_parent_id_unique" ON "team_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "team_locales_parent_id_idx" ON "team_locales" USING btree ("_parent_id");
  CREATE INDEX "partners_logo_idx" ON "partners" USING btree ("logo_id");
  CREATE INDEX "partners_updated_at_idx" ON "partners" USING btree ("updated_at");
  CREATE INDEX "partners_created_at_idx" ON "partners" USING btree ("created_at");
  CREATE UNIQUE INDEX "partners_locales_locale_parent_id_unique" ON "partners_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "partners_locales_parent_id_idx" ON "partners_locales" USING btree ("_parent_id");
  CREATE INDEX "media_updated_at_idx" ON "media" USING btree ("updated_at");
  CREATE INDEX "media_created_at_idx" ON "media" USING btree ("created_at");
  CREATE UNIQUE INDEX "media_filename_idx" ON "media" USING btree ("filename");
  CREATE INDEX "media_sizes_webp480_sizes_webp480_filename_idx" ON "media" USING btree ("sizes_webp480_filename");
  CREATE INDEX "media_sizes_webp960_sizes_webp960_filename_idx" ON "media" USING btree ("sizes_webp960_filename");
  CREATE INDEX "media_sizes_webp1600_sizes_webp1600_filename_idx" ON "media" USING btree ("sizes_webp1600_filename");
  CREATE INDEX "media_sizes_avif480_sizes_avif480_filename_idx" ON "media" USING btree ("sizes_avif480_filename");
  CREATE INDEX "media_sizes_avif960_sizes_avif960_filename_idx" ON "media" USING btree ("sizes_avif960_filename");
  CREATE INDEX "media_sizes_avif1600_sizes_avif1600_filename_idx" ON "media" USING btree ("sizes_avif1600_filename");
  CREATE UNIQUE INDEX "media_locales_locale_parent_id_unique" ON "media_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "media_locales_parent_id_idx" ON "media_locales" USING btree ("_parent_id");
  CREATE INDEX "users_sessions_order_idx" ON "users_sessions" USING btree ("_order");
  CREATE INDEX "users_sessions_parent_id_idx" ON "users_sessions" USING btree ("_parent_id");
  CREATE INDEX "users_updated_at_idx" ON "users" USING btree ("updated_at");
  CREATE INDEX "users_created_at_idx" ON "users" USING btree ("created_at");
  CREATE UNIQUE INDEX "users_email_idx" ON "users" USING btree ("email");
  CREATE UNIQUE INDEX "payload_kv_key_idx" ON "payload_kv" USING btree ("key");
  CREATE INDEX "payload_locked_documents_global_slug_idx" ON "payload_locked_documents" USING btree ("global_slug");
  CREATE INDEX "payload_locked_documents_updated_at_idx" ON "payload_locked_documents" USING btree ("updated_at");
  CREATE INDEX "payload_locked_documents_created_at_idx" ON "payload_locked_documents" USING btree ("created_at");
  CREATE INDEX "payload_locked_documents_rels_order_idx" ON "payload_locked_documents_rels" USING btree ("order");
  CREATE INDEX "payload_locked_documents_rels_parent_idx" ON "payload_locked_documents_rels" USING btree ("parent_id");
  CREATE INDEX "payload_locked_documents_rels_path_idx" ON "payload_locked_documents_rels" USING btree ("path");
  CREATE INDEX "payload_locked_documents_rels_papers_id_idx" ON "payload_locked_documents_rels" USING btree ("papers_id");
  CREATE INDEX "payload_locked_documents_rels_team_id_idx" ON "payload_locked_documents_rels" USING btree ("team_id");
  CREATE INDEX "payload_locked_documents_rels_partners_id_idx" ON "payload_locked_documents_rels" USING btree ("partners_id");
  CREATE INDEX "payload_locked_documents_rels_media_id_idx" ON "payload_locked_documents_rels" USING btree ("media_id");
  CREATE INDEX "payload_locked_documents_rels_users_id_idx" ON "payload_locked_documents_rels" USING btree ("users_id");
  CREATE INDEX "payload_preferences_key_idx" ON "payload_preferences" USING btree ("key");
  CREATE INDEX "payload_preferences_updated_at_idx" ON "payload_preferences" USING btree ("updated_at");
  CREATE INDEX "payload_preferences_created_at_idx" ON "payload_preferences" USING btree ("created_at");
  CREATE INDEX "payload_preferences_rels_order_idx" ON "payload_preferences_rels" USING btree ("order");
  CREATE INDEX "payload_preferences_rels_parent_idx" ON "payload_preferences_rels" USING btree ("parent_id");
  CREATE INDEX "payload_preferences_rels_path_idx" ON "payload_preferences_rels" USING btree ("path");
  CREATE INDEX "payload_preferences_rels_users_id_idx" ON "payload_preferences_rels" USING btree ("users_id");
  CREATE INDEX "payload_migrations_updated_at_idx" ON "payload_migrations" USING btree ("updated_at");
  CREATE INDEX "payload_migrations_created_at_idx" ON "payload_migrations" USING btree ("created_at");
  CREATE INDEX "site_social_links_order_idx" ON "site_social_links" USING btree ("_order");
  CREATE INDEX "site_social_links_parent_id_idx" ON "site_social_links" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "site_locales_locale_parent_id_unique" ON "site_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "site_locales_parent_id_idx" ON "site_locales" USING btree ("_parent_id");
  CREATE INDEX "methodology_sources_order_idx" ON "methodology_sources" USING btree ("_order");
  CREATE INDEX "methodology_sources_parent_id_idx" ON "methodology_sources" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "methodology_sources_locales_locale_parent_id_unique" ON "methodology_sources_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "methodology_sources_locales_parent_id_idx" ON "methodology_sources_locales" USING btree ("_parent_id");
  CREATE INDEX "methodology_definitions_order_idx" ON "methodology_definitions" USING btree ("_order");
  CREATE INDEX "methodology_definitions_parent_id_idx" ON "methodology_definitions" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "methodology_definitions_locales_locale_parent_id_unique" ON "methodology_definitions_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "methodology_definitions_locales_parent_id_idx" ON "methodology_definitions_locales" USING btree ("_parent_id");
  CREATE INDEX "methodology_counting_rules_order_idx" ON "methodology_counting_rules" USING btree ("_order");
  CREATE INDEX "methodology_counting_rules_parent_id_idx" ON "methodology_counting_rules" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "methodology_counting_rules_locales_locale_parent_id_unique" ON "methodology_counting_rules_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "methodology_counting_rules_locales_parent_id_idx" ON "methodology_counting_rules_locales" USING btree ("_parent_id");
  CREATE INDEX "methodology_change_log_order_idx" ON "methodology_change_log" USING btree ("_order");
  CREATE INDEX "methodology_change_log_parent_id_idx" ON "methodology_change_log" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "methodology_change_log_locales_locale_parent_id_unique" ON "methodology_change_log_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "methodology_change_log_locales_parent_id_idx" ON "methodology_change_log_locales" USING btree ("_parent_id");
  CREATE INDEX "methodology__status_idx" ON "methodology" USING btree ("_status");
  CREATE UNIQUE INDEX "methodology_locales_locale_parent_id_unique" ON "methodology_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "methodology_locales_parent_id_idx" ON "methodology_locales" USING btree ("_parent_id");
  CREATE INDEX "_methodology_v_version_sources_order_idx" ON "_methodology_v_version_sources" USING btree ("_order");
  CREATE INDEX "_methodology_v_version_sources_parent_id_idx" ON "_methodology_v_version_sources" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "_methodology_v_version_sources_locales_locale_parent_id_uniq" ON "_methodology_v_version_sources_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_methodology_v_version_sources_locales_parent_id_idx" ON "_methodology_v_version_sources_locales" USING btree ("_parent_id");
  CREATE INDEX "_methodology_v_version_definitions_order_idx" ON "_methodology_v_version_definitions" USING btree ("_order");
  CREATE INDEX "_methodology_v_version_definitions_parent_id_idx" ON "_methodology_v_version_definitions" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "_methodology_v_version_definitions_locales_locale_parent_id_" ON "_methodology_v_version_definitions_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_methodology_v_version_definitions_locales_parent_id_idx" ON "_methodology_v_version_definitions_locales" USING btree ("_parent_id");
  CREATE INDEX "_methodology_v_version_counting_rules_order_idx" ON "_methodology_v_version_counting_rules" USING btree ("_order");
  CREATE INDEX "_methodology_v_version_counting_rules_parent_id_idx" ON "_methodology_v_version_counting_rules" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "_methodology_v_version_counting_rules_locales_locale_parent_" ON "_methodology_v_version_counting_rules_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_methodology_v_version_counting_rules_locales_parent_id_idx" ON "_methodology_v_version_counting_rules_locales" USING btree ("_parent_id");
  CREATE INDEX "_methodology_v_version_change_log_order_idx" ON "_methodology_v_version_change_log" USING btree ("_order");
  CREATE INDEX "_methodology_v_version_change_log_parent_id_idx" ON "_methodology_v_version_change_log" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "_methodology_v_version_change_log_locales_locale_parent_id_u" ON "_methodology_v_version_change_log_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_methodology_v_version_change_log_locales_parent_id_idx" ON "_methodology_v_version_change_log_locales" USING btree ("_parent_id");
  CREATE INDEX "_methodology_v_version_version__status_idx" ON "_methodology_v" USING btree ("version__status");
  CREATE INDEX "_methodology_v_created_at_idx" ON "_methodology_v" USING btree ("created_at");
  CREATE INDEX "_methodology_v_updated_at_idx" ON "_methodology_v" USING btree ("updated_at");
  CREATE INDEX "_methodology_v_snapshot_idx" ON "_methodology_v" USING btree ("snapshot");
  CREATE INDEX "_methodology_v_published_locale_idx" ON "_methodology_v" USING btree ("published_locale");
  CREATE INDEX "_methodology_v_latest_idx" ON "_methodology_v" USING btree ("latest");
  CREATE UNIQUE INDEX "_methodology_v_locales_locale_parent_id_unique" ON "_methodology_v_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_methodology_v_locales_parent_id_idx" ON "_methodology_v_locales" USING btree ("_parent_id");
  CREATE INDEX "policy_history_order_idx" ON "policy_history" USING btree ("_order");
  CREATE INDEX "policy_history_parent_id_idx" ON "policy_history" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "policy_history_locales_locale_parent_id_unique" ON "policy_history_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "policy_history_locales_parent_id_idx" ON "policy_history_locales" USING btree ("_parent_id");
  CREATE INDEX "policy__status_idx" ON "policy" USING btree ("_status");
  CREATE UNIQUE INDEX "policy_locales_locale_parent_id_unique" ON "policy_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "policy_locales_parent_id_idx" ON "policy_locales" USING btree ("_parent_id");
  CREATE INDEX "_policy_v_version_history_order_idx" ON "_policy_v_version_history" USING btree ("_order");
  CREATE INDEX "_policy_v_version_history_parent_id_idx" ON "_policy_v_version_history" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "_policy_v_version_history_locales_locale_parent_id_unique" ON "_policy_v_version_history_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_policy_v_version_history_locales_parent_id_idx" ON "_policy_v_version_history_locales" USING btree ("_parent_id");
  CREATE INDEX "_policy_v_version_version__status_idx" ON "_policy_v" USING btree ("version__status");
  CREATE INDEX "_policy_v_created_at_idx" ON "_policy_v" USING btree ("created_at");
  CREATE INDEX "_policy_v_updated_at_idx" ON "_policy_v" USING btree ("updated_at");
  CREATE INDEX "_policy_v_snapshot_idx" ON "_policy_v" USING btree ("snapshot");
  CREATE INDEX "_policy_v_published_locale_idx" ON "_policy_v" USING btree ("published_locale");
  CREATE INDEX "_policy_v_latest_idx" ON "_policy_v" USING btree ("latest");
  CREATE UNIQUE INDEX "_policy_v_locales_locale_parent_id_unique" ON "_policy_v_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_policy_v_locales_parent_id_idx" ON "_policy_v_locales" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "impact_snapshot_locales_locale_parent_id_unique" ON "impact_snapshot_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "impact_snapshot_locales_parent_id_idx" ON "impact_snapshot_locales" USING btree ("_parent_id");`);
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "papers_authors" CASCADE;
  DROP TABLE "papers" CASCADE;
  DROP TABLE "papers_locales" CASCADE;
  DROP TABLE "_papers_v_version_authors" CASCADE;
  DROP TABLE "_papers_v" CASCADE;
  DROP TABLE "_papers_v_locales" CASCADE;
  DROP TABLE "team" CASCADE;
  DROP TABLE "team_locales" CASCADE;
  DROP TABLE "partners" CASCADE;
  DROP TABLE "partners_locales" CASCADE;
  DROP TABLE "media" CASCADE;
  DROP TABLE "media_locales" CASCADE;
  DROP TABLE "users_sessions" CASCADE;
  DROP TABLE "users" CASCADE;
  DROP TABLE "payload_kv" CASCADE;
  DROP TABLE "payload_locked_documents" CASCADE;
  DROP TABLE "payload_locked_documents_rels" CASCADE;
  DROP TABLE "payload_preferences" CASCADE;
  DROP TABLE "payload_preferences_rels" CASCADE;
  DROP TABLE "payload_migrations" CASCADE;
  DROP TABLE "site_social_links" CASCADE;
  DROP TABLE "site" CASCADE;
  DROP TABLE "site_locales" CASCADE;
  DROP TABLE "methodology_sources" CASCADE;
  DROP TABLE "methodology_sources_locales" CASCADE;
  DROP TABLE "methodology_definitions" CASCADE;
  DROP TABLE "methodology_definitions_locales" CASCADE;
  DROP TABLE "methodology_counting_rules" CASCADE;
  DROP TABLE "methodology_counting_rules_locales" CASCADE;
  DROP TABLE "methodology_change_log" CASCADE;
  DROP TABLE "methodology_change_log_locales" CASCADE;
  DROP TABLE "methodology" CASCADE;
  DROP TABLE "methodology_locales" CASCADE;
  DROP TABLE "_methodology_v_version_sources" CASCADE;
  DROP TABLE "_methodology_v_version_sources_locales" CASCADE;
  DROP TABLE "_methodology_v_version_definitions" CASCADE;
  DROP TABLE "_methodology_v_version_definitions_locales" CASCADE;
  DROP TABLE "_methodology_v_version_counting_rules" CASCADE;
  DROP TABLE "_methodology_v_version_counting_rules_locales" CASCADE;
  DROP TABLE "_methodology_v_version_change_log" CASCADE;
  DROP TABLE "_methodology_v_version_change_log_locales" CASCADE;
  DROP TABLE "_methodology_v" CASCADE;
  DROP TABLE "_methodology_v_locales" CASCADE;
  DROP TABLE "policy_history" CASCADE;
  DROP TABLE "policy_history_locales" CASCADE;
  DROP TABLE "policy" CASCADE;
  DROP TABLE "policy_locales" CASCADE;
  DROP TABLE "_policy_v_version_history" CASCADE;
  DROP TABLE "_policy_v_version_history_locales" CASCADE;
  DROP TABLE "_policy_v" CASCADE;
  DROP TABLE "_policy_v_locales" CASCADE;
  DROP TABLE "impact_snapshot" CASCADE;
  DROP TABLE "impact_snapshot_locales" CASCADE;
  DROP TYPE "public"."_locales";
  DROP TYPE "public"."enum_papers_publication_status";
  DROP TYPE "public"."enum_papers_status";
  DROP TYPE "public"."enum__papers_v_version_status";
  DROP TYPE "public"."enum__papers_v_published_locale";
  DROP TYPE "public"."enum_media_subject";
  DROP TYPE "public"."enum_users_role";
  DROP TYPE "public"."enum_methodology_status";
  DROP TYPE "public"."enum__methodology_v_version_status";
  DROP TYPE "public"."enum__methodology_v_published_locale";
  DROP TYPE "public"."enum_policy_history_status";
  DROP TYPE "public"."enum_policy_proposal_status";
  DROP TYPE "public"."enum_policy_status";
  DROP TYPE "public"."enum__policy_v_version_history_status";
  DROP TYPE "public"."enum__policy_v_version_status";
  DROP TYPE "public"."enum__policy_v_published_locale";`);
}

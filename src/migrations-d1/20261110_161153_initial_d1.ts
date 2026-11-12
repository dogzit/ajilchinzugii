import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-d1-sqlite'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.run(sql`CREATE TABLE \`papers_authors\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`name\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`papers\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`papers_authors_order_idx\` ON \`papers_authors\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`papers_authors_parent_id_idx\` ON \`papers_authors\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`papers_findings\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`papers\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`papers_findings_order_idx\` ON \`papers_findings\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`papers_findings_parent_id_idx\` ON \`papers_findings\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`papers_findings_locales\` (
  	\`value\` text,
  	\`label\` text,
  	\`source\` text,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`_locale\` text NOT NULL,
  	\`_parent_id\` text NOT NULL,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`papers_findings\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE UNIQUE INDEX \`papers_findings_locales_locale_parent_id_unique\` ON \`papers_findings_locales\` (\`_locale\`,\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`papers_findings_locales_parent_id_idx\` ON \`papers_findings_locales\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`papers_comparison_rows\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`group_a\` numeric,
  	\`group_b\` numeric,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`papers\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`papers_comparison_rows_order_idx\` ON \`papers_comparison_rows\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`papers_comparison_rows_parent_id_idx\` ON \`papers_comparison_rows\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`papers_comparison_rows_locales\` (
  	\`label\` text,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`_locale\` text NOT NULL,
  	\`_parent_id\` text NOT NULL,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`papers_comparison_rows\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE UNIQUE INDEX \`papers_comparison_rows_locales_locale_parent_id_unique\` ON \`papers_comparison_rows_locales\` (\`_locale\`,\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`papers_comparison_rows_locales_parent_id_idx\` ON \`papers_comparison_rows_locales\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`papers\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`slug\` text,
  	\`year\` numeric,
  	\`venue\` text,
  	\`doi\` text,
  	\`status\` text DEFAULT 'working-paper',
  	\`pdf_id\` integer,
  	\`code_url\` text,
  	\`data_url\` text,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`_status\` text DEFAULT 'draft',
  	FOREIGN KEY (\`pdf_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `)
  await db.run(sql`CREATE UNIQUE INDEX \`papers_slug_idx\` ON \`papers\` (\`slug\`);`)
  await db.run(sql`CREATE INDEX \`papers_pdf_idx\` ON \`papers\` (\`pdf_id\`);`)
  await db.run(sql`CREATE INDEX \`papers_updated_at_idx\` ON \`papers\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`papers_created_at_idx\` ON \`papers\` (\`created_at\`);`)
  await db.run(sql`CREATE INDEX \`papers__status_idx\` ON \`papers\` (\`_status\`);`)
  await db.run(sql`CREATE TABLE \`papers_locales\` (
  	\`title\` text,
  	\`abstract\` text,
  	\`comparison_title\` text,
  	\`comparison_group_a_label\` text,
  	\`comparison_group_b_label\` text,
  	\`comparison_note\` text,
  	\`citations_apa\` text,
  	\`citations_bibtex\` text,
  	\`seo_meta_title\` text,
  	\`seo_meta_description\` text,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`_locale\` text NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`papers\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE UNIQUE INDEX \`papers_locales_locale_parent_id_unique\` ON \`papers_locales\` (\`_locale\`,\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`papers_locales_parent_id_idx\` ON \`papers_locales\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`_papers_v_version_authors\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`name\` text,
  	\`_uuid\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`_papers_v\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`_papers_v_version_authors_order_idx\` ON \`_papers_v_version_authors\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`_papers_v_version_authors_parent_id_idx\` ON \`_papers_v_version_authors\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`_papers_v_version_findings\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`_uuid\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`_papers_v\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`_papers_v_version_findings_order_idx\` ON \`_papers_v_version_findings\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`_papers_v_version_findings_parent_id_idx\` ON \`_papers_v_version_findings\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`_papers_v_version_findings_locales\` (
  	\`value\` text,
  	\`label\` text,
  	\`source\` text,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`_locale\` text NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`_papers_v_version_findings\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE UNIQUE INDEX \`_papers_v_version_findings_locales_locale_parent_id_unique\` ON \`_papers_v_version_findings_locales\` (\`_locale\`,\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`_papers_v_version_findings_locales_parent_id_idx\` ON \`_papers_v_version_findings_locales\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`_papers_v_version_comparison_rows\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`group_a\` numeric,
  	\`group_b\` numeric,
  	\`_uuid\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`_papers_v\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`_papers_v_version_comparison_rows_order_idx\` ON \`_papers_v_version_comparison_rows\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`_papers_v_version_comparison_rows_parent_id_idx\` ON \`_papers_v_version_comparison_rows\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`_papers_v_version_comparison_rows_locales\` (
  	\`label\` text,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`_locale\` text NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`_papers_v_version_comparison_rows\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE UNIQUE INDEX \`_papers_v_version_comparison_rows_locales_locale_parent_id_u\` ON \`_papers_v_version_comparison_rows_locales\` (\`_locale\`,\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`_papers_v_version_comparison_rows_locales_parent_id_idx\` ON \`_papers_v_version_comparison_rows_locales\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`_papers_v\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`parent_id\` integer,
  	\`version_slug\` text,
  	\`version_year\` numeric,
  	\`version_venue\` text,
  	\`version_doi\` text,
  	\`version_status\` text DEFAULT 'working-paper',
  	\`version_pdf_id\` integer,
  	\`version_code_url\` text,
  	\`version_data_url\` text,
  	\`version_updated_at\` text,
  	\`version_created_at\` text,
  	\`version__status\` text DEFAULT 'draft',
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`snapshot\` integer,
  	\`published_locale\` text,
  	\`latest\` integer,
  	FOREIGN KEY (\`parent_id\`) REFERENCES \`papers\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`version_pdf_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `)
  await db.run(sql`CREATE INDEX \`_papers_v_parent_idx\` ON \`_papers_v\` (\`parent_id\`);`)
  await db.run(sql`CREATE INDEX \`_papers_v_version_version_slug_idx\` ON \`_papers_v\` (\`version_slug\`);`)
  await db.run(sql`CREATE INDEX \`_papers_v_version_version_pdf_idx\` ON \`_papers_v\` (\`version_pdf_id\`);`)
  await db.run(sql`CREATE INDEX \`_papers_v_version_version_updated_at_idx\` ON \`_papers_v\` (\`version_updated_at\`);`)
  await db.run(sql`CREATE INDEX \`_papers_v_version_version_created_at_idx\` ON \`_papers_v\` (\`version_created_at\`);`)
  await db.run(sql`CREATE INDEX \`_papers_v_version_version__status_idx\` ON \`_papers_v\` (\`version__status\`);`)
  await db.run(sql`CREATE INDEX \`_papers_v_created_at_idx\` ON \`_papers_v\` (\`created_at\`);`)
  await db.run(sql`CREATE INDEX \`_papers_v_updated_at_idx\` ON \`_papers_v\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`_papers_v_snapshot_idx\` ON \`_papers_v\` (\`snapshot\`);`)
  await db.run(sql`CREATE INDEX \`_papers_v_published_locale_idx\` ON \`_papers_v\` (\`published_locale\`);`)
  await db.run(sql`CREATE INDEX \`_papers_v_latest_idx\` ON \`_papers_v\` (\`latest\`);`)
  await db.run(sql`CREATE TABLE \`_papers_v_locales\` (
  	\`version_title\` text,
  	\`version_abstract\` text,
  	\`version_comparison_title\` text,
  	\`version_comparison_group_a_label\` text,
  	\`version_comparison_group_b_label\` text,
  	\`version_comparison_note\` text,
  	\`version_citations_apa\` text,
  	\`version_citations_bibtex\` text,
  	\`version_seo_meta_title\` text,
  	\`version_seo_meta_description\` text,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`_locale\` text NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`_papers_v\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE UNIQUE INDEX \`_papers_v_locales_locale_parent_id_unique\` ON \`_papers_v_locales\` (\`_locale\`,\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`_papers_v_locales_parent_id_idx\` ON \`_papers_v_locales\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`team_profiles\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`url\` text NOT NULL,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`team\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`team_profiles_order_idx\` ON \`team_profiles\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`team_profiles_parent_id_idx\` ON \`team_profiles\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`team_profiles_locales\` (
  	\`label\` text NOT NULL,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`_locale\` text NOT NULL,
  	\`_parent_id\` text NOT NULL,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`team_profiles\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE UNIQUE INDEX \`team_profiles_locales_locale_parent_id_unique\` ON \`team_profiles_locales\` (\`_locale\`,\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`team_profiles_locales_parent_id_idx\` ON \`team_profiles_locales\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`team\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`slug\` text NOT NULL,
  	\`photo_id\` integer,
  	\`confirmed_adult18_plus\` integer DEFAULT false NOT NULL,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	FOREIGN KEY (\`photo_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `)
  await db.run(sql`CREATE UNIQUE INDEX \`team_slug_idx\` ON \`team\` (\`slug\`);`)
  await db.run(sql`CREATE INDEX \`team_photo_idx\` ON \`team\` (\`photo_id\`);`)
  await db.run(sql`CREATE INDEX \`team_updated_at_idx\` ON \`team\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`team_created_at_idx\` ON \`team\` (\`created_at\`);`)
  await db.run(sql`CREATE TABLE \`team_locales\` (
  	\`name\` text NOT NULL,
  	\`role\` text NOT NULL,
  	\`bio\` text,
  	\`seo_meta_title\` text,
  	\`seo_meta_description\` text,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`_locale\` text NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`team\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE UNIQUE INDEX \`team_locales_locale_parent_id_unique\` ON \`team_locales\` (\`_locale\`,\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`team_locales_parent_id_idx\` ON \`team_locales\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`partners\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`name\` text NOT NULL,
  	\`logo_id\` integer,
  	\`url\` text,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	FOREIGN KEY (\`logo_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `)
  await db.run(sql`CREATE INDEX \`partners_logo_idx\` ON \`partners\` (\`logo_id\`);`)
  await db.run(sql`CREATE INDEX \`partners_updated_at_idx\` ON \`partners\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`partners_created_at_idx\` ON \`partners\` (\`created_at\`);`)
  await db.run(sql`CREATE TABLE \`partners_locales\` (
  	\`seo_meta_title\` text,
  	\`seo_meta_description\` text,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`_locale\` text NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`partners\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE UNIQUE INDEX \`partners_locales_locale_parent_id_unique\` ON \`partners_locales\` (\`_locale\`,\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`partners_locales_parent_id_idx\` ON \`partners_locales\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`media\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`alt_mn\` text NOT NULL,
  	\`alt_en\` text NOT NULL,
  	\`subject\` text DEFAULT 'none' NOT NULL,
  	\`consent_teen\` integer,
  	\`consent_parent\` integer,
  	\`consent_date\` text,
  	\`consent_record_ref\` text,
  	\`_objectkey\` text,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`url\` text,
  	\`thumbnail_u_r_l\` text,
  	\`filename\` text,
  	\`mime_type\` text,
  	\`filesize\` numeric,
  	\`width\` numeric,
  	\`height\` numeric,
  	\`focal_x\` numeric,
  	\`focal_y\` numeric,
  	\`sizes_webp480_url\` text,
  	\`sizes_webp480_width\` numeric,
  	\`sizes_webp480_height\` numeric,
  	\`sizes_webp480_mime_type\` text,
  	\`sizes_webp480_filesize\` numeric,
  	\`sizes_webp480_filename\` text,
  	\`sizes_webp960_url\` text,
  	\`sizes_webp960_width\` numeric,
  	\`sizes_webp960_height\` numeric,
  	\`sizes_webp960_mime_type\` text,
  	\`sizes_webp960_filesize\` numeric,
  	\`sizes_webp960_filename\` text,
  	\`sizes_webp1600_url\` text,
  	\`sizes_webp1600_width\` numeric,
  	\`sizes_webp1600_height\` numeric,
  	\`sizes_webp1600_mime_type\` text,
  	\`sizes_webp1600_filesize\` numeric,
  	\`sizes_webp1600_filename\` text,
  	\`sizes_avif480_url\` text,
  	\`sizes_avif480_width\` numeric,
  	\`sizes_avif480_height\` numeric,
  	\`sizes_avif480_mime_type\` text,
  	\`sizes_avif480_filesize\` numeric,
  	\`sizes_avif480_filename\` text,
  	\`sizes_avif960_url\` text,
  	\`sizes_avif960_width\` numeric,
  	\`sizes_avif960_height\` numeric,
  	\`sizes_avif960_mime_type\` text,
  	\`sizes_avif960_filesize\` numeric,
  	\`sizes_avif960_filename\` text,
  	\`sizes_avif1600_url\` text,
  	\`sizes_avif1600_width\` numeric,
  	\`sizes_avif1600_height\` numeric,
  	\`sizes_avif1600_mime_type\` text,
  	\`sizes_avif1600_filesize\` numeric,
  	\`sizes_avif1600_filename\` text
  );
  `)
  await db.run(sql`CREATE INDEX \`media_updated_at_idx\` ON \`media\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`media_created_at_idx\` ON \`media\` (\`created_at\`);`)
  await db.run(sql`CREATE UNIQUE INDEX \`media_filename_idx\` ON \`media\` (\`filename\`);`)
  await db.run(sql`CREATE INDEX \`media_sizes_webp480_sizes_webp480_filename_idx\` ON \`media\` (\`sizes_webp480_filename\`);`)
  await db.run(sql`CREATE INDEX \`media_sizes_webp960_sizes_webp960_filename_idx\` ON \`media\` (\`sizes_webp960_filename\`);`)
  await db.run(sql`CREATE INDEX \`media_sizes_webp1600_sizes_webp1600_filename_idx\` ON \`media\` (\`sizes_webp1600_filename\`);`)
  await db.run(sql`CREATE INDEX \`media_sizes_avif480_sizes_avif480_filename_idx\` ON \`media\` (\`sizes_avif480_filename\`);`)
  await db.run(sql`CREATE INDEX \`media_sizes_avif960_sizes_avif960_filename_idx\` ON \`media\` (\`sizes_avif960_filename\`);`)
  await db.run(sql`CREATE INDEX \`media_sizes_avif1600_sizes_avif1600_filename_idx\` ON \`media\` (\`sizes_avif1600_filename\`);`)
  await db.run(sql`CREATE TABLE \`media_locales\` (
  	\`seo_meta_title\` text,
  	\`seo_meta_description\` text,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`_locale\` text NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE UNIQUE INDEX \`media_locales_locale_parent_id_unique\` ON \`media_locales\` (\`_locale\`,\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`media_locales_parent_id_idx\` ON \`media_locales\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`users_sessions\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`created_at\` text,
  	\`expires_at\` text NOT NULL,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`users_sessions_order_idx\` ON \`users_sessions\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`users_sessions_parent_id_idx\` ON \`users_sessions\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`users\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`name\` text NOT NULL,
  	\`role\` text DEFAULT 'editor' NOT NULL,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`email\` text NOT NULL,
  	\`reset_password_token\` text,
  	\`reset_password_expiration\` text,
  	\`salt\` text,
  	\`hash\` text,
  	\`reset_password_requested_at\` text,
  	\`login_attempts\` numeric DEFAULT 0,
  	\`lock_until\` text
  );
  `)
  await db.run(sql`CREATE INDEX \`users_updated_at_idx\` ON \`users\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`users_created_at_idx\` ON \`users\` (\`created_at\`);`)
  await db.run(sql`CREATE UNIQUE INDEX \`users_email_idx\` ON \`users\` (\`email\`);`)
  await db.run(sql`CREATE TABLE \`payload_kv\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`key\` text NOT NULL,
  	\`data\` text NOT NULL
  );
  `)
  await db.run(sql`CREATE UNIQUE INDEX \`payload_kv_key_idx\` ON \`payload_kv\` (\`key\`);`)
  await db.run(sql`CREATE TABLE \`payload_locked_documents\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`global_slug\` text,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
  );
  `)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_global_slug_idx\` ON \`payload_locked_documents\` (\`global_slug\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_updated_at_idx\` ON \`payload_locked_documents\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_created_at_idx\` ON \`payload_locked_documents\` (\`created_at\`);`)
  await db.run(sql`CREATE TABLE \`payload_locked_documents_rels\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`order\` integer,
  	\`parent_id\` integer NOT NULL,
  	\`path\` text NOT NULL,
  	\`papers_id\` integer,
  	\`team_id\` integer,
  	\`partners_id\` integer,
  	\`media_id\` integer,
  	\`users_id\` integer,
  	FOREIGN KEY (\`parent_id\`) REFERENCES \`payload_locked_documents\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`papers_id\`) REFERENCES \`papers\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`team_id\`) REFERENCES \`team\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`partners_id\`) REFERENCES \`partners\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`media_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`users_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_order_idx\` ON \`payload_locked_documents_rels\` (\`order\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_parent_idx\` ON \`payload_locked_documents_rels\` (\`parent_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_path_idx\` ON \`payload_locked_documents_rels\` (\`path\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_papers_id_idx\` ON \`payload_locked_documents_rels\` (\`papers_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_team_id_idx\` ON \`payload_locked_documents_rels\` (\`team_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_partners_id_idx\` ON \`payload_locked_documents_rels\` (\`partners_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_media_id_idx\` ON \`payload_locked_documents_rels\` (\`media_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_users_id_idx\` ON \`payload_locked_documents_rels\` (\`users_id\`);`)
  await db.run(sql`CREATE TABLE \`payload_preferences\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`key\` text,
  	\`value\` text,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
  );
  `)
  await db.run(sql`CREATE INDEX \`payload_preferences_key_idx\` ON \`payload_preferences\` (\`key\`);`)
  await db.run(sql`CREATE INDEX \`payload_preferences_updated_at_idx\` ON \`payload_preferences\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`payload_preferences_created_at_idx\` ON \`payload_preferences\` (\`created_at\`);`)
  await db.run(sql`CREATE TABLE \`payload_preferences_rels\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`order\` integer,
  	\`parent_id\` integer NOT NULL,
  	\`path\` text NOT NULL,
  	\`users_id\` integer,
  	FOREIGN KEY (\`parent_id\`) REFERENCES \`payload_preferences\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`users_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`payload_preferences_rels_order_idx\` ON \`payload_preferences_rels\` (\`order\`);`)
  await db.run(sql`CREATE INDEX \`payload_preferences_rels_parent_idx\` ON \`payload_preferences_rels\` (\`parent_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_preferences_rels_path_idx\` ON \`payload_preferences_rels\` (\`path\`);`)
  await db.run(sql`CREATE INDEX \`payload_preferences_rels_users_id_idx\` ON \`payload_preferences_rels\` (\`users_id\`);`)
  await db.run(sql`CREATE TABLE \`payload_migrations\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`name\` text,
  	\`batch\` numeric,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
  );
  `)
  await db.run(sql`CREATE INDEX \`payload_migrations_updated_at_idx\` ON \`payload_migrations\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`payload_migrations_created_at_idx\` ON \`payload_migrations\` (\`created_at\`);`)
  await db.run(sql`CREATE TABLE \`site_social_links\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`platform\` text NOT NULL,
  	\`url\` text NOT NULL,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`site\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`site_social_links_order_idx\` ON \`site_social_links\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`site_social_links_parent_id_idx\` ON \`site_social_links\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`site\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`logo_id\` integer,
  	\`hero_image_id\` integer,
  	\`contact_email\` text NOT NULL,
  	\`organization_founding_date\` text,
  	\`updated_at\` text,
  	\`created_at\` text,
  	FOREIGN KEY (\`logo_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`hero_image_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `)
  await db.run(sql`CREATE INDEX \`site_logo_idx\` ON \`site\` (\`logo_id\`);`)
  await db.run(sql`CREATE INDEX \`site_hero_image_idx\` ON \`site\` (\`hero_image_id\`);`)
  await db.run(sql`CREATE TABLE \`site_locales\` (
  	\`mission_line\` text NOT NULL,
  	\`organization_legal_name\` text NOT NULL,
  	\`organization_address_city\` text,
  	\`seo_meta_title\` text,
  	\`seo_meta_description\` text,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`_locale\` text NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`site\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE UNIQUE INDEX \`site_locales_locale_parent_id_unique\` ON \`site_locales\` (\`_locale\`,\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`site_locales_parent_id_idx\` ON \`site_locales\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`methodology_sources\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`url\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`methodology\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`methodology_sources_order_idx\` ON \`methodology_sources\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`methodology_sources_parent_id_idx\` ON \`methodology_sources\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`methodology_sources_locales\` (
  	\`title\` text,
  	\`note\` text,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`_locale\` text NOT NULL,
  	\`_parent_id\` text NOT NULL,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`methodology_sources\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE UNIQUE INDEX \`methodology_sources_locales_locale_parent_id_unique\` ON \`methodology_sources_locales\` (\`_locale\`,\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`methodology_sources_locales_parent_id_idx\` ON \`methodology_sources_locales\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`methodology_definitions\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`anchor_id\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`methodology\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`methodology_definitions_order_idx\` ON \`methodology_definitions\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`methodology_definitions_parent_id_idx\` ON \`methodology_definitions\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`methodology_definitions_locales\` (
  	\`term\` text,
  	\`definition\` text,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`_locale\` text NOT NULL,
  	\`_parent_id\` text NOT NULL,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`methodology_definitions\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE UNIQUE INDEX \`methodology_definitions_locales_locale_parent_id_unique\` ON \`methodology_definitions_locales\` (\`_locale\`,\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`methodology_definitions_locales_parent_id_idx\` ON \`methodology_definitions_locales\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`methodology_counting_rules\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`anchor_id\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`methodology\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`methodology_counting_rules_order_idx\` ON \`methodology_counting_rules\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`methodology_counting_rules_parent_id_idx\` ON \`methodology_counting_rules\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`methodology_counting_rules_locales\` (
  	\`rule\` text,
  	\`detail\` text,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`_locale\` text NOT NULL,
  	\`_parent_id\` text NOT NULL,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`methodology_counting_rules\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE UNIQUE INDEX \`methodology_counting_rules_locales_locale_parent_id_unique\` ON \`methodology_counting_rules_locales\` (\`_locale\`,\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`methodology_counting_rules_locales_parent_id_idx\` ON \`methodology_counting_rules_locales\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`methodology_measures_items\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` text NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`methodology_measures\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`methodology_measures_items_order_idx\` ON \`methodology_measures_items\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`methodology_measures_items_parent_id_idx\` ON \`methodology_measures_items\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`methodology_measures_items_locales\` (
  	\`label\` text,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`_locale\` text NOT NULL,
  	\`_parent_id\` text NOT NULL,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`methodology_measures_items\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE UNIQUE INDEX \`methodology_measures_items_locales_locale_parent_id_unique\` ON \`methodology_measures_items_locales\` (\`_locale\`,\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`methodology_measures_items_locales_parent_id_idx\` ON \`methodology_measures_items_locales\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`methodology_measures\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`methodology\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`methodology_measures_order_idx\` ON \`methodology_measures\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`methodology_measures_parent_id_idx\` ON \`methodology_measures\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`methodology_measures_locales\` (
  	\`category\` text,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`_locale\` text NOT NULL,
  	\`_parent_id\` text NOT NULL,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`methodology_measures\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE UNIQUE INDEX \`methodology_measures_locales_locale_parent_id_unique\` ON \`methodology_measures_locales\` (\`_locale\`,\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`methodology_measures_locales_parent_id_idx\` ON \`methodology_measures_locales\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`methodology_change_log\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`date\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`methodology\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`methodology_change_log_order_idx\` ON \`methodology_change_log\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`methodology_change_log_parent_id_idx\` ON \`methodology_change_log\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`methodology_change_log_locales\` (
  	\`summary\` text,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`_locale\` text NOT NULL,
  	\`_parent_id\` text NOT NULL,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`methodology_change_log\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE UNIQUE INDEX \`methodology_change_log_locales_locale_parent_id_unique\` ON \`methodology_change_log_locales\` (\`_locale\`,\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`methodology_change_log_locales_parent_id_idx\` ON \`methodology_change_log_locales\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`methodology\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`_status\` text DEFAULT 'draft',
  	\`updated_at\` text,
  	\`created_at\` text
  );
  `)
  await db.run(sql`CREATE INDEX \`methodology__status_idx\` ON \`methodology\` (\`_status\`);`)
  await db.run(sql`CREATE TABLE \`methodology_locales\` (
  	\`limitations\` text,
  	\`seo_meta_title\` text,
  	\`seo_meta_description\` text,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`_locale\` text NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`methodology\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE UNIQUE INDEX \`methodology_locales_locale_parent_id_unique\` ON \`methodology_locales\` (\`_locale\`,\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`methodology_locales_parent_id_idx\` ON \`methodology_locales\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`_methodology_v_version_sources\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`url\` text,
  	\`_uuid\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`_methodology_v\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`_methodology_v_version_sources_order_idx\` ON \`_methodology_v_version_sources\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`_methodology_v_version_sources_parent_id_idx\` ON \`_methodology_v_version_sources\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`_methodology_v_version_sources_locales\` (
  	\`title\` text,
  	\`note\` text,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`_locale\` text NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`_methodology_v_version_sources\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE UNIQUE INDEX \`_methodology_v_version_sources_locales_locale_parent_id_uniq\` ON \`_methodology_v_version_sources_locales\` (\`_locale\`,\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`_methodology_v_version_sources_locales_parent_id_idx\` ON \`_methodology_v_version_sources_locales\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`_methodology_v_version_definitions\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`anchor_id\` text,
  	\`_uuid\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`_methodology_v\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`_methodology_v_version_definitions_order_idx\` ON \`_methodology_v_version_definitions\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`_methodology_v_version_definitions_parent_id_idx\` ON \`_methodology_v_version_definitions\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`_methodology_v_version_definitions_locales\` (
  	\`term\` text,
  	\`definition\` text,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`_locale\` text NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`_methodology_v_version_definitions\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE UNIQUE INDEX \`_methodology_v_version_definitions_locales_locale_parent_id_\` ON \`_methodology_v_version_definitions_locales\` (\`_locale\`,\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`_methodology_v_version_definitions_locales_parent_id_idx\` ON \`_methodology_v_version_definitions_locales\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`_methodology_v_version_counting_rules\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`anchor_id\` text,
  	\`_uuid\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`_methodology_v\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`_methodology_v_version_counting_rules_order_idx\` ON \`_methodology_v_version_counting_rules\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`_methodology_v_version_counting_rules_parent_id_idx\` ON \`_methodology_v_version_counting_rules\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`_methodology_v_version_counting_rules_locales\` (
  	\`rule\` text,
  	\`detail\` text,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`_locale\` text NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`_methodology_v_version_counting_rules\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE UNIQUE INDEX \`_methodology_v_version_counting_rules_locales_locale_parent_\` ON \`_methodology_v_version_counting_rules_locales\` (\`_locale\`,\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`_methodology_v_version_counting_rules_locales_parent_id_idx\` ON \`_methodology_v_version_counting_rules_locales\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`_methodology_v_version_measures_items\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`_uuid\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`_methodology_v_version_measures\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`_methodology_v_version_measures_items_order_idx\` ON \`_methodology_v_version_measures_items\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`_methodology_v_version_measures_items_parent_id_idx\` ON \`_methodology_v_version_measures_items\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`_methodology_v_version_measures_items_locales\` (
  	\`label\` text,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`_locale\` text NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`_methodology_v_version_measures_items\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE UNIQUE INDEX \`_methodology_v_version_measures_items_locales_locale_parent_\` ON \`_methodology_v_version_measures_items_locales\` (\`_locale\`,\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`_methodology_v_version_measures_items_locales_parent_id_idx\` ON \`_methodology_v_version_measures_items_locales\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`_methodology_v_version_measures\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`_uuid\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`_methodology_v\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`_methodology_v_version_measures_order_idx\` ON \`_methodology_v_version_measures\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`_methodology_v_version_measures_parent_id_idx\` ON \`_methodology_v_version_measures\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`_methodology_v_version_measures_locales\` (
  	\`category\` text,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`_locale\` text NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`_methodology_v_version_measures\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE UNIQUE INDEX \`_methodology_v_version_measures_locales_locale_parent_id_uni\` ON \`_methodology_v_version_measures_locales\` (\`_locale\`,\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`_methodology_v_version_measures_locales_parent_id_idx\` ON \`_methodology_v_version_measures_locales\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`_methodology_v_version_change_log\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`date\` text,
  	\`_uuid\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`_methodology_v\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`_methodology_v_version_change_log_order_idx\` ON \`_methodology_v_version_change_log\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`_methodology_v_version_change_log_parent_id_idx\` ON \`_methodology_v_version_change_log\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`_methodology_v_version_change_log_locales\` (
  	\`summary\` text,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`_locale\` text NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`_methodology_v_version_change_log\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE UNIQUE INDEX \`_methodology_v_version_change_log_locales_locale_parent_id_u\` ON \`_methodology_v_version_change_log_locales\` (\`_locale\`,\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`_methodology_v_version_change_log_locales_parent_id_idx\` ON \`_methodology_v_version_change_log_locales\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`_methodology_v\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`version__status\` text DEFAULT 'draft',
  	\`version_updated_at\` text,
  	\`version_created_at\` text,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`snapshot\` integer,
  	\`published_locale\` text,
  	\`latest\` integer
  );
  `)
  await db.run(sql`CREATE INDEX \`_methodology_v_version_version__status_idx\` ON \`_methodology_v\` (\`version__status\`);`)
  await db.run(sql`CREATE INDEX \`_methodology_v_created_at_idx\` ON \`_methodology_v\` (\`created_at\`);`)
  await db.run(sql`CREATE INDEX \`_methodology_v_updated_at_idx\` ON \`_methodology_v\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`_methodology_v_snapshot_idx\` ON \`_methodology_v\` (\`snapshot\`);`)
  await db.run(sql`CREATE INDEX \`_methodology_v_published_locale_idx\` ON \`_methodology_v\` (\`published_locale\`);`)
  await db.run(sql`CREATE INDEX \`_methodology_v_latest_idx\` ON \`_methodology_v\` (\`latest\`);`)
  await db.run(sql`CREATE TABLE \`_methodology_v_locales\` (
  	\`version_limitations\` text,
  	\`version_seo_meta_title\` text,
  	\`version_seo_meta_description\` text,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`_locale\` text NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`_methodology_v\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE UNIQUE INDEX \`_methodology_v_locales_locale_parent_id_unique\` ON \`_methodology_v_locales\` (\`_locale\`,\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`_methodology_v_locales_parent_id_idx\` ON \`_methodology_v_locales\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`policy_proposals\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`policy\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`policy_proposals_order_idx\` ON \`policy_proposals\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`policy_proposals_parent_id_idx\` ON \`policy_proposals\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`policy_proposals_locales\` (
  	\`change\` text,
  	\`gap\` text,
  	\`evidence\` text,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`_locale\` text NOT NULL,
  	\`_parent_id\` text NOT NULL,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`policy_proposals\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE UNIQUE INDEX \`policy_proposals_locales_locale_parent_id_unique\` ON \`policy_proposals_locales\` (\`_locale\`,\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`policy_proposals_locales_parent_id_idx\` ON \`policy_proposals_locales\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`policy_history\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`date\` text,
  	\`status\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`policy\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`policy_history_order_idx\` ON \`policy_history\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`policy_history_parent_id_idx\` ON \`policy_history\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`policy_history_locales\` (
  	\`note\` text,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`_locale\` text NOT NULL,
  	\`_parent_id\` text NOT NULL,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`policy_history\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE UNIQUE INDEX \`policy_history_locales_locale_parent_id_unique\` ON \`policy_history_locales\` (\`_locale\`,\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`policy_history_locales_parent_id_idx\` ON \`policy_history_locales\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`policy\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`based_on_id\` integer,
  	\`status\` text DEFAULT 'drafted',
  	\`status_date\` text,
  	\`_status\` text DEFAULT 'draft',
  	\`updated_at\` text,
  	\`created_at\` text,
  	FOREIGN KEY (\`based_on_id\`) REFERENCES \`papers\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `)
  await db.run(sql`CREATE INDEX \`policy_based_on_idx\` ON \`policy\` (\`based_on_id\`);`)
  await db.run(sql`CREATE INDEX \`policy__status_idx\` ON \`policy\` (\`_status\`);`)
  await db.run(sql`CREATE TABLE \`policy_locales\` (
  	\`summary\` text,
  	\`full_text\` text,
  	\`seo_meta_title\` text,
  	\`seo_meta_description\` text,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`_locale\` text NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`policy\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE UNIQUE INDEX \`policy_locales_locale_parent_id_unique\` ON \`policy_locales\` (\`_locale\`,\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`policy_locales_parent_id_idx\` ON \`policy_locales\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`_policy_v_version_proposals\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`_uuid\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`_policy_v\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`_policy_v_version_proposals_order_idx\` ON \`_policy_v_version_proposals\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`_policy_v_version_proposals_parent_id_idx\` ON \`_policy_v_version_proposals\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`_policy_v_version_proposals_locales\` (
  	\`change\` text,
  	\`gap\` text,
  	\`evidence\` text,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`_locale\` text NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`_policy_v_version_proposals\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE UNIQUE INDEX \`_policy_v_version_proposals_locales_locale_parent_id_unique\` ON \`_policy_v_version_proposals_locales\` (\`_locale\`,\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`_policy_v_version_proposals_locales_parent_id_idx\` ON \`_policy_v_version_proposals_locales\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`_policy_v_version_history\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`date\` text,
  	\`status\` text,
  	\`_uuid\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`_policy_v\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`_policy_v_version_history_order_idx\` ON \`_policy_v_version_history\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`_policy_v_version_history_parent_id_idx\` ON \`_policy_v_version_history\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`_policy_v_version_history_locales\` (
  	\`note\` text,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`_locale\` text NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`_policy_v_version_history\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE UNIQUE INDEX \`_policy_v_version_history_locales_locale_parent_id_unique\` ON \`_policy_v_version_history_locales\` (\`_locale\`,\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`_policy_v_version_history_locales_parent_id_idx\` ON \`_policy_v_version_history_locales\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`_policy_v\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`version_based_on_id\` integer,
  	\`version_status\` text DEFAULT 'drafted',
  	\`version_status_date\` text,
  	\`version__status\` text DEFAULT 'draft',
  	\`version_updated_at\` text,
  	\`version_created_at\` text,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`snapshot\` integer,
  	\`published_locale\` text,
  	\`latest\` integer,
  	FOREIGN KEY (\`version_based_on_id\`) REFERENCES \`papers\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `)
  await db.run(sql`CREATE INDEX \`_policy_v_version_version_based_on_idx\` ON \`_policy_v\` (\`version_based_on_id\`);`)
  await db.run(sql`CREATE INDEX \`_policy_v_version_version__status_idx\` ON \`_policy_v\` (\`version__status\`);`)
  await db.run(sql`CREATE INDEX \`_policy_v_created_at_idx\` ON \`_policy_v\` (\`created_at\`);`)
  await db.run(sql`CREATE INDEX \`_policy_v_updated_at_idx\` ON \`_policy_v\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`_policy_v_snapshot_idx\` ON \`_policy_v\` (\`snapshot\`);`)
  await db.run(sql`CREATE INDEX \`_policy_v_published_locale_idx\` ON \`_policy_v\` (\`published_locale\`);`)
  await db.run(sql`CREATE INDEX \`_policy_v_latest_idx\` ON \`_policy_v\` (\`latest\`);`)
  await db.run(sql`CREATE TABLE \`_policy_v_locales\` (
  	\`version_summary\` text,
  	\`version_full_text\` text,
  	\`version_seo_meta_title\` text,
  	\`version_seo_meta_description\` text,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`_locale\` text NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`_policy_v\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE UNIQUE INDEX \`_policy_v_locales_locale_parent_id_unique\` ON \`_policy_v_locales\` (\`_locale\`,\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`_policy_v_locales_parent_id_idx\` ON \`_policy_v_locales\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`impact_snapshot\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`data\` text,
  	\`fetched_at\` text,
  	\`updated_at\` text,
  	\`created_at\` text
  );
  `)
  await db.run(sql`CREATE TABLE \`impact_snapshot_locales\` (
  	\`seo_meta_title\` text,
  	\`seo_meta_description\` text,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`_locale\` text NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`impact_snapshot\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE UNIQUE INDEX \`impact_snapshot_locales_locale_parent_id_unique\` ON \`impact_snapshot_locales\` (\`_locale\`,\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`impact_snapshot_locales_parent_id_idx\` ON \`impact_snapshot_locales\` (\`_parent_id\`);`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.run(sql`DROP TABLE \`papers_authors\`;`)
  await db.run(sql`DROP TABLE \`papers_findings\`;`)
  await db.run(sql`DROP TABLE \`papers_findings_locales\`;`)
  await db.run(sql`DROP TABLE \`papers_comparison_rows\`;`)
  await db.run(sql`DROP TABLE \`papers_comparison_rows_locales\`;`)
  await db.run(sql`DROP TABLE \`papers\`;`)
  await db.run(sql`DROP TABLE \`papers_locales\`;`)
  await db.run(sql`DROP TABLE \`_papers_v_version_authors\`;`)
  await db.run(sql`DROP TABLE \`_papers_v_version_findings\`;`)
  await db.run(sql`DROP TABLE \`_papers_v_version_findings_locales\`;`)
  await db.run(sql`DROP TABLE \`_papers_v_version_comparison_rows\`;`)
  await db.run(sql`DROP TABLE \`_papers_v_version_comparison_rows_locales\`;`)
  await db.run(sql`DROP TABLE \`_papers_v\`;`)
  await db.run(sql`DROP TABLE \`_papers_v_locales\`;`)
  await db.run(sql`DROP TABLE \`team_profiles\`;`)
  await db.run(sql`DROP TABLE \`team_profiles_locales\`;`)
  await db.run(sql`DROP TABLE \`team\`;`)
  await db.run(sql`DROP TABLE \`team_locales\`;`)
  await db.run(sql`DROP TABLE \`partners\`;`)
  await db.run(sql`DROP TABLE \`partners_locales\`;`)
  await db.run(sql`DROP TABLE \`media\`;`)
  await db.run(sql`DROP TABLE \`media_locales\`;`)
  await db.run(sql`DROP TABLE \`users_sessions\`;`)
  await db.run(sql`DROP TABLE \`users\`;`)
  await db.run(sql`DROP TABLE \`payload_kv\`;`)
  await db.run(sql`DROP TABLE \`payload_locked_documents\`;`)
  await db.run(sql`DROP TABLE \`payload_locked_documents_rels\`;`)
  await db.run(sql`DROP TABLE \`payload_preferences\`;`)
  await db.run(sql`DROP TABLE \`payload_preferences_rels\`;`)
  await db.run(sql`DROP TABLE \`payload_migrations\`;`)
  await db.run(sql`DROP TABLE \`site_social_links\`;`)
  await db.run(sql`DROP TABLE \`site\`;`)
  await db.run(sql`DROP TABLE \`site_locales\`;`)
  await db.run(sql`DROP TABLE \`methodology_sources\`;`)
  await db.run(sql`DROP TABLE \`methodology_sources_locales\`;`)
  await db.run(sql`DROP TABLE \`methodology_definitions\`;`)
  await db.run(sql`DROP TABLE \`methodology_definitions_locales\`;`)
  await db.run(sql`DROP TABLE \`methodology_counting_rules\`;`)
  await db.run(sql`DROP TABLE \`methodology_counting_rules_locales\`;`)
  await db.run(sql`DROP TABLE \`methodology_measures_items\`;`)
  await db.run(sql`DROP TABLE \`methodology_measures_items_locales\`;`)
  await db.run(sql`DROP TABLE \`methodology_measures\`;`)
  await db.run(sql`DROP TABLE \`methodology_measures_locales\`;`)
  await db.run(sql`DROP TABLE \`methodology_change_log\`;`)
  await db.run(sql`DROP TABLE \`methodology_change_log_locales\`;`)
  await db.run(sql`DROP TABLE \`methodology\`;`)
  await db.run(sql`DROP TABLE \`methodology_locales\`;`)
  await db.run(sql`DROP TABLE \`_methodology_v_version_sources\`;`)
  await db.run(sql`DROP TABLE \`_methodology_v_version_sources_locales\`;`)
  await db.run(sql`DROP TABLE \`_methodology_v_version_definitions\`;`)
  await db.run(sql`DROP TABLE \`_methodology_v_version_definitions_locales\`;`)
  await db.run(sql`DROP TABLE \`_methodology_v_version_counting_rules\`;`)
  await db.run(sql`DROP TABLE \`_methodology_v_version_counting_rules_locales\`;`)
  await db.run(sql`DROP TABLE \`_methodology_v_version_measures_items\`;`)
  await db.run(sql`DROP TABLE \`_methodology_v_version_measures_items_locales\`;`)
  await db.run(sql`DROP TABLE \`_methodology_v_version_measures\`;`)
  await db.run(sql`DROP TABLE \`_methodology_v_version_measures_locales\`;`)
  await db.run(sql`DROP TABLE \`_methodology_v_version_change_log\`;`)
  await db.run(sql`DROP TABLE \`_methodology_v_version_change_log_locales\`;`)
  await db.run(sql`DROP TABLE \`_methodology_v\`;`)
  await db.run(sql`DROP TABLE \`_methodology_v_locales\`;`)
  await db.run(sql`DROP TABLE \`policy_proposals\`;`)
  await db.run(sql`DROP TABLE \`policy_proposals_locales\`;`)
  await db.run(sql`DROP TABLE \`policy_history\`;`)
  await db.run(sql`DROP TABLE \`policy_history_locales\`;`)
  await db.run(sql`DROP TABLE \`policy\`;`)
  await db.run(sql`DROP TABLE \`policy_locales\`;`)
  await db.run(sql`DROP TABLE \`_policy_v_version_proposals\`;`)
  await db.run(sql`DROP TABLE \`_policy_v_version_proposals_locales\`;`)
  await db.run(sql`DROP TABLE \`_policy_v_version_history\`;`)
  await db.run(sql`DROP TABLE \`_policy_v_version_history_locales\`;`)
  await db.run(sql`DROP TABLE \`_policy_v\`;`)
  await db.run(sql`DROP TABLE \`_policy_v_locales\`;`)
  await db.run(sql`DROP TABLE \`impact_snapshot\`;`)
  await db.run(sql`DROP TABLE \`impact_snapshot_locales\`;`)
}

import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-d1-sqlite'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.run(sql`CREATE TABLE \`cases\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`case_id\` text NOT NULL,
  	\`priority\` text NOT NULL,
  	\`deadline\` text NOT NULL,
  	\`over_capacity\` integer DEFAULT false,
  	\`week_key\` text NOT NULL,
  	\`status\` text DEFAULT 'new' NOT NULL,
  	\`outcome\` text,
  	\`caseworker_id\` integer,
  	\`failed_rules\` text NOT NULL,
  	\`age_band\` text,
  	\`job_category\` text,
  	\`contact_method\` text NOT NULL,
  	\`contact\` text NOT NULL,
  	\`best_time\` text,
  	\`description\` text,
  	\`consent_to_contact\` integer DEFAULT false NOT NULL,
  	\`store_file\` integer DEFAULT false,
  	\`guardian_consent\` integer DEFAULT false,
  	\`guardian_consent_at\` text,
  	\`guardian_confirmed_on_call\` integer DEFAULT false,
  	\`file_key\` text,
  	\`file_delete_at\` text,
  	\`member_clerk_id\` text,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	FOREIGN KEY (\`caseworker_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `)
  await db.run(sql`CREATE UNIQUE INDEX \`cases_case_id_idx\` ON \`cases\` (\`case_id\`);`)
  await db.run(sql`CREATE INDEX \`cases_week_key_idx\` ON \`cases\` (\`week_key\`);`)
  await db.run(sql`CREATE INDEX \`cases_caseworker_idx\` ON \`cases\` (\`caseworker_id\`);`)
  await db.run(sql`CREATE INDEX \`cases_member_clerk_id_idx\` ON \`cases\` (\`member_clerk_id\`);`)
  await db.run(sql`CREATE INDEX \`cases_updated_at_idx\` ON \`cases\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`cases_created_at_idx\` ON \`cases\` (\`created_at\`);`)
  await db.run(sql`CREATE TABLE \`case_access_log\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`case_id\` integer,
  	\`user_id\` integer NOT NULL,
  	\`action\` text NOT NULL,
  	\`at\` text NOT NULL,
  	FOREIGN KEY (\`case_id\`) REFERENCES \`cases\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `)
  await db.run(sql`CREATE INDEX \`case_access_log_case_idx\` ON \`case_access_log\` (\`case_id\`);`)
  await db.run(sql`CREATE INDEX \`case_access_log_user_idx\` ON \`case_access_log\` (\`user_id\`);`)
  await db.run(sql`CREATE TABLE \`rater_stats\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`rule_id\` text NOT NULL,
  	\`result\` text NOT NULL,
  	\`rule_set_version\` text NOT NULL,
  	\`month\` text NOT NULL,
  	\`age_band\` text NOT NULL,
  	\`job_category\` text NOT NULL,
  	\`employer_kind\` text NOT NULL,
  	\`aimag\` text,
  	\`count\` numeric NOT NULL
  );
  `)
  await db.run(sql`CREATE INDEX \`rater_stats_rule_id_idx\` ON \`rater_stats\` (\`rule_id\`);`)
  await db.run(sql`CREATE INDEX \`rater_stats_month_idx\` ON \`rater_stats\` (\`month\`);`)
  await db.run(sql`ALTER TABLE \`users\` ADD \`on_duty\` integer DEFAULT false;`)
  await db.run(sql`ALTER TABLE \`payload_locked_documents_rels\` ADD \`cases_id\` integer REFERENCES cases(id);`)
  await db.run(sql`ALTER TABLE \`payload_locked_documents_rels\` ADD \`case_access_log_id\` integer REFERENCES case_access_log(id);`)
  await db.run(sql`ALTER TABLE \`payload_locked_documents_rels\` ADD \`rater_stats_id\` integer REFERENCES rater_stats(id);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_cases_id_idx\` ON \`payload_locked_documents_rels\` (\`cases_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_case_access_log_id_idx\` ON \`payload_locked_documents_rels\` (\`case_access_log_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_rater_stats_id_idx\` ON \`payload_locked_documents_rels\` (\`rater_stats_id\`);`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.run(sql`DROP TABLE \`cases\`;`)
  await db.run(sql`DROP TABLE \`case_access_log\`;`)
  await db.run(sql`DROP TABLE \`rater_stats\`;`)
  await db.run(sql`PRAGMA foreign_keys=OFF;`)
  await db.run(sql`CREATE TABLE \`__new_payload_locked_documents_rels\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`order\` integer,
  	\`parent_id\` integer NOT NULL,
  	\`path\` text NOT NULL,
  	\`papers_id\` integer,
  	\`team_id\` integer,
  	\`partners_id\` integer,
  	\`media_id\` integer,
  	\`users_id\` integer,
  	\`members_id\` integer,
  	\`saved_ratings_id\` integer,
  	FOREIGN KEY (\`parent_id\`) REFERENCES \`payload_locked_documents\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`papers_id\`) REFERENCES \`papers\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`team_id\`) REFERENCES \`team\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`partners_id\`) REFERENCES \`partners\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`media_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`users_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`members_id\`) REFERENCES \`members\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`saved_ratings_id\`) REFERENCES \`saved_ratings\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`INSERT INTO \`__new_payload_locked_documents_rels\`("id", "order", "parent_id", "path", "papers_id", "team_id", "partners_id", "media_id", "users_id", "members_id", "saved_ratings_id") SELECT "id", "order", "parent_id", "path", "papers_id", "team_id", "partners_id", "media_id", "users_id", "members_id", "saved_ratings_id" FROM \`payload_locked_documents_rels\`;`)
  await db.run(sql`DROP TABLE \`payload_locked_documents_rels\`;`)
  await db.run(sql`ALTER TABLE \`__new_payload_locked_documents_rels\` RENAME TO \`payload_locked_documents_rels\`;`)
  await db.run(sql`PRAGMA foreign_keys=ON;`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_order_idx\` ON \`payload_locked_documents_rels\` (\`order\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_parent_idx\` ON \`payload_locked_documents_rels\` (\`parent_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_path_idx\` ON \`payload_locked_documents_rels\` (\`path\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_papers_id_idx\` ON \`payload_locked_documents_rels\` (\`papers_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_team_id_idx\` ON \`payload_locked_documents_rels\` (\`team_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_partners_id_idx\` ON \`payload_locked_documents_rels\` (\`partners_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_media_id_idx\` ON \`payload_locked_documents_rels\` (\`media_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_users_id_idx\` ON \`payload_locked_documents_rels\` (\`users_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_members_id_idx\` ON \`payload_locked_documents_rels\` (\`members_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_saved_ratings_id_idx\` ON \`payload_locked_documents_rels\` (\`saved_ratings_id\`);`)
  await db.run(sql`ALTER TABLE \`users\` DROP COLUMN \`on_duty\`;`)
}

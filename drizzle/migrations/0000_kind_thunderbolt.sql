CREATE TABLE `notes` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`content` text NOT NULL,
	`is_published` integer DEFAULT false,
	`published_slug` text,
	`version` integer DEFAULT 1,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `notes_published_slug_unique` ON `notes` (`published_slug`);--> statement-breakpoint
CREATE TABLE `providers` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`encrypted_api_key` text NOT NULL,
	`models` text NOT NULL,
	`limits` text NOT NULL,
	`updated_at` integer
);
--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`refresh_token` text NOT NULL,
	`device_name` text,
	`created_at` integer NOT NULL,
	`expires_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `settings` (
	`id` integer PRIMARY KEY DEFAULT 1 NOT NULL,
	`selected_provider` text,
	`selected_transcription_model` text,
	`selected_finetune_model` text,
	`custom_system_prompt` text,
	`auto_fine_tune` integer DEFAULT false,
	`theme` text DEFAULT 'system',
	`updated_at` integer
);
--> statement-breakpoint
CREATE TABLE `sync_log` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`entity_type` text NOT NULL,
	`entity_id` text NOT NULL,
	`operation` text NOT NULL,
	`version` integer NOT NULL,
	`timestamp` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `transcripts` (
	`id` text PRIMARY KEY NOT NULL,
	`recording_id` text,
	`text` text NOT NULL,
	`fine_tuned_text` text,
	`provider` text NOT NULL,
	`model` text NOT NULL,
	`tags` text,
	`version` integer DEFAULT 1,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer
);

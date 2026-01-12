CREATE TABLE `canvases` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text DEFAULT 'Untitled Canvas' NOT NULL,
	`data` text NOT NULL,
	`thumbnail` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE `settings` DROP COLUMN `dashboard_layout`;
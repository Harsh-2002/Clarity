ALTER TABLE `bookmarks` ADD `version` integer DEFAULT 1;--> statement-breakpoint
ALTER TABLE `bookmarks` ADD `deleted_at` integer;--> statement-breakpoint
ALTER TABLE `canvases` ADD `version` integer DEFAULT 1;--> statement-breakpoint
ALTER TABLE `canvases` ADD `deleted_at` integer;--> statement-breakpoint
ALTER TABLE `journal_entries` ADD `version` integer DEFAULT 1;--> statement-breakpoint
ALTER TABLE `journal_entries` ADD `updated_at` integer;--> statement-breakpoint
ALTER TABLE `journal_entries` ADD `deleted_at` integer;--> statement-breakpoint
ALTER TABLE `kanban_cards` ADD `version` integer DEFAULT 1;--> statement-breakpoint
ALTER TABLE `kanban_cards` ADD `deleted_at` integer;--> statement-breakpoint
ALTER TABLE `kanban_columns` ADD `version` integer DEFAULT 1;--> statement-breakpoint
ALTER TABLE `kanban_columns` ADD `deleted_at` integer;--> statement-breakpoint
ALTER TABLE `tasks` ADD `version` integer DEFAULT 1;--> statement-breakpoint
ALTER TABLE `tasks` ADD `deleted_at` integer;--> statement-breakpoint
CREATE INDEX `sync_log_timestamp_idx` ON `sync_log` (`timestamp`);
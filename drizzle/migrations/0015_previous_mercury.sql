CREATE INDEX `notes_active_updated_idx` ON `notes` (`deleted_at`,`updated_at`);--> statement-breakpoint
CREATE INDEX `tasks_active_idx` ON `tasks` (`deleted_at`,`completed`);--> statement-breakpoint
CREATE INDEX `transcripts_active_created_idx` ON `transcripts` (`deleted_at`,`created_at`);
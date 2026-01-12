CREATE INDEX `canvases_updated_at_idx` ON `canvases` (`updated_at`);--> statement-breakpoint
CREATE INDEX `kanban_cards_column_id_idx` ON `kanban_cards` (`column_id`);--> statement-breakpoint
CREATE INDEX `sessions_expires_at_idx` ON `sessions` (`expires_at`);--> statement-breakpoint
CREATE INDEX `sync_log_entity_idx` ON `sync_log` (`entity_type`,`entity_id`);--> statement-breakpoint
CREATE INDEX `tasks_due_date_idx` ON `tasks` (`due_date`);--> statement-breakpoint
CREATE INDEX `tasks_completed_idx` ON `tasks` (`completed`);
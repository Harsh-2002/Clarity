CREATE TABLE `journal_entries` (
	`id` text PRIMARY KEY NOT NULL,
	`content` text NOT NULL,
	`mood` text,
	`tags` text,
	`converted_to` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `journal_created_at_idx` ON `journal_entries` (`created_at`);
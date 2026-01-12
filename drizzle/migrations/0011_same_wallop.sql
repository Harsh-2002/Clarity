CREATE TABLE `bookmarks` (
	`id` text PRIMARY KEY NOT NULL,
	`url` text NOT NULL,
	`title` text,
	`description` text,
	`image` text,
	`favicon` text,
	`tags` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `bookmarks_url_idx` ON `bookmarks` (`url`);--> statement-breakpoint
CREATE INDEX `bookmarks_created_at_idx` ON `bookmarks` (`created_at`);
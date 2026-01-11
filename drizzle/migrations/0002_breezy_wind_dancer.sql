CREATE TABLE `system_config` (
	`id` integer PRIMARY KEY DEFAULT 1 NOT NULL,
	`jwt_secret` text NOT NULL,
	`encryption_key` text NOT NULL,
	`setup_complete` integer DEFAULT false,
	`updated_at` integer
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`username` text NOT NULL,
	`password_hash` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_username_unique` ON `users` (`username`);
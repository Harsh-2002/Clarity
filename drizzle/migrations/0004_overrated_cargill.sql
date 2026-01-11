CREATE TABLE `kanban_cards` (
	`id` text PRIMARY KEY NOT NULL,
	`column_id` text NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`position` integer DEFAULT 0,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`column_id`) REFERENCES `kanban_columns`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `kanban_columns` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`position` integer DEFAULT 0,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `tasks` (
	`id` text PRIMARY KEY NOT NULL,
	`text` text NOT NULL,
	`completed` integer DEFAULT false,
	`priority` text DEFAULT 'medium',
	`due_date` integer,
	`position` integer DEFAULT 0,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);

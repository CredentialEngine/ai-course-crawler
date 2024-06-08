CREATE TABLE `catalogue_data` (
	`id` integer PRIMARY KEY NOT NULL,
	`extraction_id` integer NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`extraction_id`) REFERENCES `extractions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `catalogues` (
	`id` integer PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`url` text NOT NULL,
	`thumbnail_url` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `data_items` (
	`id` integer PRIMARY KEY NOT NULL,
	`catalogue_data_id` integer NOT NULL,
	`extraction_step_item_id` integer,
	`structured_data` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`catalogue_data_id`) REFERENCES `catalogue_data`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`extraction_step_item_id`) REFERENCES `extraction_step_items`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `extraction_logs` (
	`id` integer PRIMARY KEY NOT NULL,
	`extraction_id` integer NOT NULL,
	`log` text NOT NULL,
	`log_level` text DEFAULT 'INFO' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`extraction_id`) REFERENCES `extractions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `extraction_step_items` (
	`id` integer PRIMARY KEY NOT NULL,
	`extraction_step_id` integer NOT NULL,
	`status` text NOT NULL,
	`url` text NOT NULL,
	`content` text NOT NULL,
	`screenshot` text,
	`metadata` text,
	`navigation_data` text,
	`data_type` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`extraction_step_id`) REFERENCES `extraction_steps`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `extraction_steps` (
	`id` integer PRIMARY KEY NOT NULL,
	`extraction_id` integer NOT NULL,
	`step` text NOT NULL,
	`parent_step_id` integer,
	`configuration` text,
	`status` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`extraction_id`) REFERENCES `extractions`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`parent_step_id`) REFERENCES `extraction_steps`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `extractions` (
	`id` integer PRIMARY KEY NOT NULL,
	`recipe_id` integer NOT NULL,
	`status` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`recipe_id`) REFERENCES `recipes`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `recipes` (
	`id` integer PRIMARY KEY NOT NULL,
	`is_default` integer DEFAULT false NOT NULL,
	`catalogue_id` integer NOT NULL,
	`url` text NOT NULL,
	`configuration` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`configured_at` text,
	`detection_started_at` text,
	FOREIGN KEY (`catalogue_id`) REFERENCES `catalogues`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL,
	`is_encrypted` integer DEFAULT false NOT NULL,
	`encrypted_preview` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` integer PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`password` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);
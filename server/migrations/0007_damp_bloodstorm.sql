CREATE TABLE `model_api_calls` (
	`id` integer PRIMARY KEY NOT NULL,
	`extraction_id` integer,
	`provider` text NOT NULL,
	`model` text NOT NULL,
	`call_site` text NOT NULL,
	`input_token_count` integer NOT NULL,
	`output_token_count` integer NOT NULL,
	FOREIGN KEY (`extraction_id`) REFERENCES `extractions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `extraction_idx` ON `model_api_calls` (`extraction_id`);
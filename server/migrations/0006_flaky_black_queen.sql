ALTER TABLE recipes ADD COLUMN status_new TEXT NOT NULL DEFAULT 'WAITING';--> statement-breakpoint
UPDATE recipes SET status_new = status;--> statement-breakpoint
ALTER TABLE recipes DROP COLUMN status;--> statement-breakpoint
ALTER TABLE recipes RENAME COLUMN status_new TO status;--> statement-breakpoint
ALTER TABLE extractions ADD COLUMN status_new TEXT NOT NULL DEFAULT 'WAITING';--> statement-breakpoint
UPDATE extractions SET status_new = status;--> statement-breakpoint
ALTER TABLE extractions DROP COLUMN status;--> statement-breakpoint
ALTER TABLE extractions RENAME COLUMN status_new TO status;--> statement-breakpoint
ALTER TABLE crawl_pages ADD COLUMN status_new TEXT NOT NULL DEFAULT 'WAITING';--> statement-breakpoint
UPDATE crawl_pages SET status_new = status;--> statement-breakpoint
ALTER TABLE crawl_pages DROP COLUMN status;--> statement-breakpoint
ALTER TABLE crawl_pages RENAME COLUMN status_new TO status;--> statement-breakpoint
ALTER TABLE `crawl_pages` ADD `data_extraction_started_at` text;--> statement-breakpoint
ALTER TABLE `extractions` ADD `completion_stats` text;--> statement-breakpoint
CREATE INDEX `status_idx` ON `crawl_pages` (`status`);--> statement-breakpoint
CREATE INDEX `data_type_idx` ON `crawl_pages` (`data_type`);--> statement-breakpoint
CREATE INDEX `step_idx` ON `crawl_pages` (`crawl_step_id`);--> statement-breakpoint
ALTER TABLE `crawl_steps` DROP COLUMN `status`;

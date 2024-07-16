ALTER TABLE `extraction_step_items` DROP COLUMN `metadata`;
--> statement-breakpoint
ALTER TABLE `extraction_step_items` DROP COLUMN `navigation_data`;
--> statement-breakpoint
ALTER TABLE `extraction_step_items` DROP COLUMN `content`;
--> statement-breakpoint
ALTER TABLE `extraction_step_items` ADD COLUMN `content` TEXT;

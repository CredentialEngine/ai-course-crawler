ALTER TABLE `recipes` ADD `detection_failure_reason` text;--> statement-breakpoint
ALTER TABLE `recipes` ADD `status` text DEFAULT 'WAITING' NOT NULL;--> statement-breakpoint
UPDATE `recipes` SET `status` = 'SUCCESS' where `configured_at` IS NOT NULL; --> statement-breakpoint
ALTER TABLE `recipes` DROP COLUMN `configured_at`;--> statement-breakpoint
ALTER TABLE `recipes` DROP COLUMN `detection_started_at`;

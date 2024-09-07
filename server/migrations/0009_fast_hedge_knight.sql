DROP INDEX IF EXISTS `status_idx`;--> statement-breakpoint
DROP INDEX IF EXISTS `data_type_idx`;--> statement-breakpoint
DROP INDEX IF EXISTS `step_idx`;--> statement-breakpoint
DROP INDEX IF EXISTS `extraction_idx`;--> statement-breakpoint
CREATE INDEX `crawl_pages_status_idx` ON `crawl_pages` (`status`);--> statement-breakpoint
CREATE INDEX `crawl_pages_data_type_idx` ON `crawl_pages` (`data_type`);--> statement-breakpoint
CREATE INDEX `crawl_pages_step_idx` ON `crawl_pages` (`crawl_step_id`);--> statement-breakpoint
CREATE INDEX `crawl_steps_extraction_idx` ON `crawl_steps` (`extraction_id`);--> statement-breakpoint
CREATE INDEX `crawl_steps_parent_step_idx` ON `crawl_steps` (`parent_step_id`);--> statement-breakpoint
CREATE INDEX `data_items_dataset_idx` ON `data_items` (`dataset_id`);--> statement-breakpoint
CREATE INDEX `data_items_crawl_page_idx` ON `data_items` (`crawl_page_id`);--> statement-breakpoint
CREATE INDEX `datasets_catalogue_idx` ON `datasets` (`catalogue_id`);--> statement-breakpoint
CREATE INDEX `datasets_extraction_idx` ON `datasets` (`extraction_id`);--> statement-breakpoint
CREATE INDEX `extraction_logs_extraction_idx` ON `extraction_logs` (`extraction_id`);--> statement-breakpoint
CREATE INDEX `extractions_recipe_idx` ON `extractions` (`recipe_id`);--> statement-breakpoint
CREATE INDEX `model_api_calls_extraction_idx` ON `model_api_calls` (`extraction_id`);--> statement-breakpoint
CREATE INDEX `recipes_catalogue_idx` ON `recipes` (`catalogue_id`);
ALTER TABLE `extraction_step_items` RENAME TO `crawl_pages`;--> statement-breakpoint
ALTER TABLE `extraction_steps` RENAME TO `crawl_steps`;--> statement-breakpoint
ALTER TABLE `data_items` RENAME COLUMN `extraction_step_item_id` TO `crawl_page_id`;--> statement-breakpoint
ALTER TABLE `crawl_pages` RENAME COLUMN `extraction_step_id` TO `crawl_step_id`;

CREATE UNIQUE INDEX `catalogues_url_unique` ON `catalogues` (`url`);--> statement-breakpoint
CREATE UNIQUE INDEX `crawl_pages_crawl_step_id_url_unique` ON `crawl_pages` (`crawl_step_id`,`url`);--> statement-breakpoint
CREATE UNIQUE INDEX `datasets_catalogue_id_extraction_id_unique` ON `datasets` (`catalogue_id`,`extraction_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `settings_key_unique` ON `settings` (`key`);
CREATE TABLE datasets (
	`id` integer PRIMARY KEY NOT NULL,
  `catalogue_id` integer NOT NULL,
	`extraction_id` integer NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`catalogue_id`) REFERENCES `catalogues`(`id`) ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY (`extraction_id`) REFERENCES `extractions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE data_items_new (
	id integer PRIMARY KEY NOT NULL,
	crawl_page_id integer,
  dataset_id integer,
	structured_data text NOT NULL,
	created_at text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY ("crawl_page_id") REFERENCES "crawl_pages"(id) ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY ("dataset_id") REFERENCES "datasets"(id) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO datasets (id, catalogue_id, extraction_id, created_at)
SELECT catalogue_data.id,
  recipes.catalogue_id,
  extractions.id,
  catalogue_data.created_at
FROM
  catalogue_data
INNER JOIN extractions on extractions.id = catalogue_data.extraction_id
INNER JOIN recipes on recipes.id = extractions.recipe_id;
--> statement-breakpoint
INSERT INTO data_items_new (id, crawl_page_id, dataset_id, structured_data, created_at)
SELECT id, crawl_page_id, catalogue_data_id, structured_data, created_at
FROM data_items;
--> statement-breakpoint
DROP TABLE data_items;
--> statement-breakpoint
ALTER TABLE data_items_new RENAME TO data_items;
--> statement-breakpoint
DROP TABLE catalogue_data;

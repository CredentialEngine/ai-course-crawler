DO $$ BEGIN
 CREATE TYPE "public"."extraction_status" AS ENUM('WAITING', 'IN_PROGRESS', 'COMPLETE', 'STALE', 'CANCELLED');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."log_level" AS ENUM('INFO', 'ERROR');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."page_status" AS ENUM('WAITING', 'IN_PROGRESS', 'SUCCESS', 'ERROR');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."page_type" AS ENUM('COURSE_DETAIL_PAGE', 'CATEGORY_LINKS_PAGE', 'COURSE_LINKS_PAGE');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."provider" AS ENUM('openai');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."provider_model" AS ENUM('gpt-4o');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."recipe_detection_status" AS ENUM('WAITING', 'IN_PROGRESS', 'SUCCESS', 'ERROR');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."step" AS ENUM('FETCH_ROOT', 'FETCH_PAGINATED', 'FETCH_LINKS');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."url_pattern_type" AS ENUM('page_num', 'offset');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "catalogues" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"url" text NOT NULL,
	"thumbnail_url" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "catalogues_url_unique" UNIQUE("url")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "crawl_pages" (
	"id" serial PRIMARY KEY NOT NULL,
	"extraction_id" integer NOT NULL,
	"crawl_step_id" integer NOT NULL,
	"status" "page_status" DEFAULT 'WAITING' NOT NULL,
	"url" text NOT NULL,
	"content" text,
	"screenshot" text,
	"fetch_failure_reason" jsonb,
	"data_type" "page_type",
	"data_extraction_started_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "crawl_pages_extraction_id_url_unique" UNIQUE("extraction_id","url")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "crawl_steps" (
	"id" serial PRIMARY KEY NOT NULL,
	"extraction_id" integer NOT NULL,
	"step" "step" NOT NULL,
	"parent_step_id" integer,
	"configuration" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "data_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"dataset_id" integer NOT NULL,
	"crawl_page_id" integer,
	"structured_data" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "datasets" (
	"id" serial PRIMARY KEY NOT NULL,
	"catalogue_id" integer NOT NULL,
	"extraction_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "datasets_catalogue_id_extraction_id_unique" UNIQUE("catalogue_id","extraction_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "extraction_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"extraction_id" integer NOT NULL,
	"log" text NOT NULL,
	"log_level" "log_level" DEFAULT 'INFO' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "extractions" (
	"id" serial PRIMARY KEY NOT NULL,
	"recipe_id" integer NOT NULL,
	"completion_stats" jsonb,
	"status" "extraction_status" DEFAULT 'WAITING' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "model_api_calls" (
	"id" serial PRIMARY KEY NOT NULL,
	"extraction_id" integer,
	"provider" "provider" NOT NULL,
	"model" "provider_model" NOT NULL,
	"call_site" text NOT NULL,
	"input_token_count" integer NOT NULL,
	"output_token_count" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "recipes" (
	"id" serial PRIMARY KEY NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"catalogue_id" integer NOT NULL,
	"url" text NOT NULL,
	"configuration" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"detection_failure_reason" text,
	"status" "recipe_detection_status" DEFAULT 'WAITING' NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "settings" (
	"key" text PRIMARY KEY NOT NULL,
	"value" text NOT NULL,
	"is_encrypted" boolean DEFAULT false NOT NULL,
	"encrypted_preview" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "settings_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"password" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "crawl_pages" ADD CONSTRAINT "crawl_pages_extraction_id_extractions_id_fk" FOREIGN KEY ("extraction_id") REFERENCES "public"."extractions"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "crawl_pages" ADD CONSTRAINT "crawl_pages_crawl_step_id_crawl_steps_id_fk" FOREIGN KEY ("crawl_step_id") REFERENCES "public"."crawl_steps"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "crawl_steps" ADD CONSTRAINT "crawl_steps_extraction_id_extractions_id_fk" FOREIGN KEY ("extraction_id") REFERENCES "public"."extractions"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "crawl_steps" ADD CONSTRAINT "crawl_steps_parent_step_id_crawl_steps_id_fk" FOREIGN KEY ("parent_step_id") REFERENCES "public"."crawl_steps"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "data_items" ADD CONSTRAINT "data_items_dataset_id_datasets_id_fk" FOREIGN KEY ("dataset_id") REFERENCES "public"."datasets"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "data_items" ADD CONSTRAINT "data_items_crawl_page_id_crawl_pages_id_fk" FOREIGN KEY ("crawl_page_id") REFERENCES "public"."crawl_pages"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "datasets" ADD CONSTRAINT "datasets_catalogue_id_catalogues_id_fk" FOREIGN KEY ("catalogue_id") REFERENCES "public"."catalogues"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "datasets" ADD CONSTRAINT "datasets_extraction_id_extractions_id_fk" FOREIGN KEY ("extraction_id") REFERENCES "public"."extractions"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "extraction_logs" ADD CONSTRAINT "extraction_logs_extraction_id_extractions_id_fk" FOREIGN KEY ("extraction_id") REFERENCES "public"."extractions"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "extractions" ADD CONSTRAINT "extractions_recipe_id_recipes_id_fk" FOREIGN KEY ("recipe_id") REFERENCES "public"."recipes"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "model_api_calls" ADD CONSTRAINT "model_api_calls_extraction_id_extractions_id_fk" FOREIGN KEY ("extraction_id") REFERENCES "public"."extractions"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "recipes" ADD CONSTRAINT "recipes_catalogue_id_catalogues_id_fk" FOREIGN KEY ("catalogue_id") REFERENCES "public"."catalogues"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "crawl_pages_extraction_idx" ON "crawl_pages" USING btree ("extraction_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "crawl_pages_status_idx" ON "crawl_pages" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "crawl_pages_data_type_idx" ON "crawl_pages" USING btree ("data_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "crawl_pages_step_idx" ON "crawl_pages" USING btree ("crawl_step_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "crawl_steps_extraction_idx" ON "crawl_steps" USING btree ("extraction_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "crawl_steps_parent_step_idx" ON "crawl_steps" USING btree ("parent_step_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "data_items_dataset_idx" ON "data_items" USING btree ("dataset_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "data_items_crawl_page_idx" ON "data_items" USING btree ("crawl_page_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "datasets_catalogue_idx" ON "datasets" USING btree ("catalogue_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "datasets_extraction_idx" ON "datasets" USING btree ("extraction_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "extraction_logs_extraction_idx" ON "extraction_logs" USING btree ("extraction_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "extractions_recipe_idx" ON "extractions" USING btree ("recipe_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "model_api_calls_extraction_idx" ON "model_api_calls" USING btree ("extraction_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "recipes_catalogue_idx" ON "recipes" USING btree ("catalogue_id");
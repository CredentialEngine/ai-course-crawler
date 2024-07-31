import { relations, sql } from "drizzle-orm";
import {
  AnySQLiteColumn,
  index,
  integer,
  sqliteTable,
  text,
  unique,
} from "drizzle-orm/sqlite-core";
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

if (!process.env.ENCRYPTION_KEY)
  throw new Error("Please define an encryption key.");

export const ENCRYPTION_KEY: string = process.env.ENCRYPTION_KEY;

export function toDbEnum(myEnum: any): [string, ...string[]] {
  return Object.values(myEnum).map((value: any) => `${value}`) as [
    string,
    ...string[]
  ];
}

export enum PageType {
  COURSE_DETAIL_PAGE = "COURSE_DETAIL_PAGE",
  CATEGORY_LINKS_PAGE = "CATEGORY_LINKS_PAGE",
  COURSE_LINKS_PAGE = "COURSE_LINKS_PAGE",
}

export type UrlPatternType = "page_num" | "offset";

export interface PaginationConfiguration {
  urlPatternType: UrlPatternType;
  urlPattern: string;
  totalPages: number;
}

export interface RecipeConfiguration {
  pageType: PageType;
  linkRegexp?: string;
  pagination?: PaginationConfiguration;
  links?: RecipeConfiguration;
}

export enum LogLevel {
  INFO = "INFO",
  ERROR = "ERROR",
}

export enum ExtractionStatus {
  WAITING = "WAITING",
  IN_PROGRESS = "IN_PROGRESS",
  COMPLETE = "COMPLETE",
  STALE = "STALE",
  CANCELLED = "CANCELLED",
}

export enum PageStatus {
  WAITING = "WAITING",
  IN_PROGRESS = "IN_PROGRESS",
  SUCCESS = "SUCCESS",
  ERROR = "ERROR",
}

export enum RecipeDetectionStatus {
  WAITING = "WAITING",
  IN_PROGRESS = "IN_PROGRESS",
  SUCCESS = "SUCCESS",
  ERROR = "ERROR",
}

export enum Step {
  FETCH_ROOT = "FETCH_ROOT",
  FETCH_PAGINATED = "FETCH_PAGINATED",
  FETCH_LINKS = "FETCH_LINKS",
}

export interface CourseStructuredData {
  course_id: string;
  course_name: string;
  course_description: string;
  course_credits_min?: number;
  course_credits_max?: number;
  course_credits_type?: string;
}

export interface StepCompletionStats {
  downloads: {
    total: number;
    attempted: number;
    succeeded: number;
  };
  extractions: {
    attempted: number;
    succeeded: number;
    courses: number;
  };
}

export interface CompletionStats {
  steps: StepCompletionStats[];
  generatedAt: string;
}

export function getSqliteTimestamp() {
  return sql`CURRENT_TIMESTAMP`;
}

const catalogues = sqliteTable("catalogues", {
  id: integer("id").primaryKey(),
  name: text("name").notNull(),
  url: text("url").notNull().unique(),
  thumbnailUrl: text("thumbnail_url"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

const cataloguesRelations = relations(catalogues, ({ many }) => ({
  recipes: many(recipes),
}));

const recipes = sqliteTable("recipes", {
  id: integer("id").primaryKey(),
  isDefault: integer("is_default", { mode: "boolean" })
    .default(false)
    .notNull(),
  catalogueId: integer("catalogue_id")
    .notNull()
    .references(() => catalogues.id, { onDelete: "cascade" }),
  url: text("url").notNull(),
  configuration: text("configuration", { mode: "json" })
    .$type<RecipeConfiguration>()
    .notNull(),
  createdAt: text("created_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  detectionFailureReason: text("detection_failure_reason"),
  status: text("status", { enum: toDbEnum(RecipeDetectionStatus) })
    .notNull()
    .default(RecipeDetectionStatus.WAITING),
});

const recipesRelations = relations(recipes, ({ one, many }) => ({
  catalogue: one(catalogues, {
    fields: [recipes.catalogueId],
    references: [catalogues.id],
  }),
  extractions: many(extractions),
}));

const extractions = sqliteTable("extractions", {
  id: integer("id").primaryKey(),
  recipeId: integer("recipe_id")
    .notNull()
    .references(() => recipes.id, { onDelete: "cascade" }),
  completionStats: text("completion_stats", {
    mode: "json",
  }).$type<CompletionStats>(),
  status: text("status", { enum: toDbEnum(ExtractionStatus) })
    .notNull()
    .default(ExtractionStatus.WAITING),
  createdAt: text("created_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

const extractionsRelations = relations(extractions, ({ one, many }) => ({
  recipe: one(recipes, {
    fields: [extractions.recipeId],
    references: [recipes.id],
  }),
  crawlSteps: many(crawlSteps),
  dataset: many(datasets),
  logs: many(extractionLogs),
}));

const extractionLogs = sqliteTable("extraction_logs", {
  id: integer("id").primaryKey(),
  extractionId: integer("extraction_id")
    .notNull()
    .references(() => extractions.id, { onDelete: "cascade" }),
  log: text("log").notNull(),
  logLevel: text("log_level", { enum: toDbEnum(LogLevel) })
    .notNull()
    .default(LogLevel.INFO),
  createdAt: text("created_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

const extractionLogsRelations = relations(extractionLogs, ({ one }) => ({
  extraction: one(extractions, {
    fields: [extractionLogs.extractionId],
    references: [extractions.id],
  }),
}));

const crawlSteps = sqliteTable("crawl_steps", {
  id: integer("id").primaryKey(),
  extractionId: integer("extraction_id")
    .notNull()
    .references(() => extractions.id, { onDelete: "cascade" }),
  step: text("step", { enum: toDbEnum(Step) }).notNull(),
  parentStepId: integer("parent_step_id").references(
    (): AnySQLiteColumn => crawlSteps.id,
    {
      onDelete: "cascade",
    }
  ),
  configuration: text("configuration", { mode: "json" })
    .$type<RecipeConfiguration>()
    .notNull(),
  createdAt: text("created_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

const crawlStepsRelations = relations(crawlSteps, ({ one, many }) => ({
  extraction: one(extractions, {
    fields: [crawlSteps.extractionId],
    references: [extractions.id],
  }),
  parentStep: one(crawlSteps, {
    fields: [crawlSteps.parentStepId],
    references: [crawlSteps.id],
  }),
  childSteps: many(crawlSteps),
  crawlPages: many(crawlPages),
}));

const crawlPages = sqliteTable(
  "crawl_pages",
  {
    id: integer("id").primaryKey(),
    crawlStepId: integer("crawl_step_id")
      .notNull()
      .references(() => crawlSteps.id, { onDelete: "cascade" }),
    status: text("status", { enum: toDbEnum(PageStatus) })
      .notNull()
      .default(PageStatus.WAITING),
    url: text("url").notNull(),
    content: text("content"),
    screenshot: text("screenshot"),
    dataType: text("data_type", { enum: toDbEnum(PageType) }),
    dataExtractionStartedAt: text("data_extraction_started_at"),
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (t) => ({
    uniq: unique().on(t.crawlStepId, t.url),
    statusIdx: index("status_idx").on(t.status),
    dataTypeIdx: index("data_type_idx").on(t.dataType),
    stepIdx: index("step_idx").on(t.crawlStepId),
  })
);

const crawlPageRelations = relations(crawlPages, ({ one, many }) => ({
  crawlStep: one(crawlSteps, {
    fields: [crawlPages.crawlStepId],
    references: [crawlSteps.id],
  }),
  dataItems: many(dataItems),
}));

const datasets = sqliteTable(
  "datasets",
  {
    id: integer("id").primaryKey(),
    catalogueId: integer("catalogue_id")
      .notNull()
      .references(() => catalogues.id, { onDelete: "cascade" }),
    extractionId: integer("extraction_id")
      .notNull()
      .references(() => extractions.id, { onDelete: "cascade" }),
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (t) => ({
    uniq: unique().on(t.catalogueId, t.extractionId),
  })
);

const datasetsRelations = relations(datasets, ({ one, many }) => ({
  extraction: one(extractions, {
    fields: [datasets.extractionId],
    references: [extractions.id],
  }),
  dataItems: many(dataItems),
}));

const dataItems = sqliteTable("data_items", {
  id: integer("id").primaryKey(),
  datasetId: integer("dataset_id")
    .notNull()
    .references(() => datasets.id, { onDelete: "cascade" }),
  crawlPageId: integer("crawl_page_id").references(() => crawlPages.id, {
    onDelete: "cascade",
  }),
  structuredData: text("structured_data", { mode: "json" })
    .$type<CourseStructuredData>()
    .notNull(),
  createdAt: text("created_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

const dataItemsRelations = relations(dataItems, ({ one }) => ({
  dataset: one(datasets, {
    fields: [dataItems.datasetId],
    references: [datasets.id],
  }),
  crawlPage: one(crawlPages, {
    fields: [dataItems.crawlPageId],
    references: [crawlPages.id],
  }),
}));

const settings = sqliteTable("settings", {
  key: text("key").primaryKey().notNull().unique(),
  value: text("value").notNull(),
  isEncrypted: integer("is_encrypted", { mode: "boolean" })
    .default(false)
    .notNull(),
  encryptedPreview: text("encrypted_preview"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

const users = sqliteTable("users", {
  id: integer("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  createdAt: text("created_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

export function encryptForDb(text: string) {
  const IV = randomBytes(16);
  let cipher = createCipheriv("aes-256-cbc", Buffer.from(ENCRYPTION_KEY), IV);
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return `${encrypted.toString("hex")}:${IV.toString("hex")}`;
}

export function decryptFromDb(text: string) {
  const [value, IV] = text.split(":");
  let encryptedText = Buffer.from(value, "hex");
  let decipher = createDecipheriv(
    "aes-256-cbc",
    Buffer.from(ENCRYPTION_KEY),
    Buffer.from(IV, "hex")
  );
  let decrypted = decipher.update(encryptedText);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString();
}

export {
  catalogues,
  cataloguesRelations,
  crawlPageRelations,
  crawlPages,
  crawlSteps,
  crawlStepsRelations,
  dataItems,
  dataItemsRelations,
  datasets,
  datasetsRelations,
  extractionLogs,
  extractionLogsRelations,
  extractions,
  extractionsRelations,
  recipes,
  recipesRelations,
  settings,
  users,
};

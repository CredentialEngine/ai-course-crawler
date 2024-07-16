import { relations, sql } from "drizzle-orm";
import {
  AnySQLiteColumn,
  integer,
  sqliteTable,
  text,
} from "drizzle-orm/sqlite-core";
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

if (!process.env.ENCRYPTION_KEY)
  throw new Error("Please define an encryption key.");
export const ENCRYPTION_KEY: string = process.env.ENCRYPTION_KEY;

export enum PAGE_DATA_TYPE {
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
  pageType: PAGE_DATA_TYPE;
  linkRegexp?: string;
  pagination?: PaginationConfiguration;
  links?: RecipeConfiguration;
}

export interface FetchPaginatedUrlsStepConfiguration {
  dataType: PAGE_DATA_TYPE;
  pagination: PaginationConfiguration;
  categoryLevel?: number;
}

export interface FetchCategoryLinksStepConfiguration {
  level: number;
}

export interface FetchCourseLinksStepConfiguration {}

export interface FetchCourseDetailsStepConfiguration {}

export interface CourseDetailMetadata {
  url: string;
  screenshot: string;
  category?: string;
}

export enum EXTRACTION_LOG_LEVELS {
  INFO = "INFO",
  ERROR = "ERROR",
}

export enum EXTRACTION_STATUSES {
  IN_PROGRESS = "IN_PROGRESS",
  SUCCESS = "SUCCESS",
  ERROR = "ERROR",
}

export enum STEP_STATUSES {
  IN_PROGRESS = "IN_PROGRESS",
  SUCCESS = "SUCCESS",
  ERROR = "ERROR",
}

export enum STEP_ITEM_STATUSES {
  WAITING = "WAITING",
  IN_PROGRESS = "IN_PROGRESS",
  SUCCESS = "SUCCESS",
  ERROR = "ERROR",
}

export enum STEPS {
  FETCH_ROOT = "FETCH_ROOT",
  FETCH_PAGINATED = "FETCH_PAGINATED",
  FETCH_LINKS = "FETCH_LINKS",
}

export interface NavigationData {
  detailUrls?: string[];
}

export interface CourseStructuredData {
  course_id: string;
  course_name: string;
  course_description: string;
  course_credits_min: number;
  course_credits_max: number;
}

const catalogues = sqliteTable("catalogues", {
  id: integer("id").primaryKey(),
  name: text("name").notNull(),
  url: text("url").notNull(),
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
  configuredAt: text("configured_at"),
  detectionStartedAt: text("detection_started_at"),
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
  status: text("status").notNull(),
  createdAt: text("created_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

const extractionsRelations = relations(extractions, ({ one, many }) => ({
  recipe: one(recipes, {
    fields: [extractions.recipeId],
    references: [recipes.id],
  }),
  extractionSteps: many(extractionSteps),
  catalogueData: many(catalogueData),
  logs: many(extractionLogs),
}));

const extractionLogs = sqliteTable("extraction_logs", {
  id: integer("id").primaryKey(),
  extractionId: integer("extraction_id")
    .notNull()
    .references(() => extractions.id, { onDelete: "cascade" }),
  log: text("log").notNull(),
  logLevel: text("log_level").notNull().default("INFO"),
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

const extractionSteps = sqliteTable("extraction_steps", {
  id: integer("id").primaryKey(),
  extractionId: integer("extraction_id")
    .notNull()
    .references(() => extractions.id, { onDelete: "cascade" }),
  step: text("step").notNull(),
  parentStepId: integer("parent_step_id").references(
    (): AnySQLiteColumn => extractionSteps.id,
    {
      onDelete: "cascade",
    }
  ),
  configuration: text("configuration", { mode: "json" }),
  status: text("status").notNull(),
  createdAt: text("created_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

const extractionStepsRelations = relations(
  extractionSteps,
  ({ one, many }) => ({
    extraction: one(extractions, {
      fields: [extractionSteps.extractionId],
      references: [extractions.id],
    }),
    parentStep: one(extractionSteps, {
      fields: [extractionSteps.parentStepId],
      references: [extractionSteps.id],
    }),
    childSteps: many(extractionSteps),
    extractionStepItems: many(extractionStepItems),
  })
);

const extractionStepItems = sqliteTable("extraction_step_items", {
  id: integer("id").primaryKey(),
  extractionStepId: integer("extraction_step_id")
    .notNull()
    .references(() => extractionSteps.id, { onDelete: "cascade" }),
  status: text("status").notNull(),
  url: text("url").notNull(),
  content: text("content"),
  screenshot: text("screenshot"),
  dataType: text("data_type"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

const extractionStepItemsRelations = relations(
  extractionStepItems,
  ({ one, many }) => ({
    extractionStep: one(extractionSteps, {
      fields: [extractionStepItems.extractionStepId],
      references: [extractionSteps.id],
    }),
    dataItems: many(dataItems),
  })
);

const catalogueData = sqliteTable("catalogue_data", {
  id: integer("id").primaryKey(),
  extractionId: integer("extraction_id")
    .notNull()
    .references(() => extractions.id, { onDelete: "cascade" }),
  createdAt: text("created_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

const catalogueDataRelations = relations(catalogueData, ({ one, many }) => ({
  extraction: one(extractions, {
    fields: [catalogueData.extractionId],
    references: [extractions.id],
  }),
  dataItems: many(dataItems),
}));

const dataItems = sqliteTable("data_items", {
  id: integer("id").primaryKey(),
  catalogueDataId: integer("catalogue_data_id")
    .notNull()
    .references(() => catalogueData.id, { onDelete: "cascade" }),
  extractionStepItemId: integer("extraction_step_item_id").references(
    () => extractionStepItems.id,
    { onDelete: "cascade" }
  ),
  structuredData: text("structured_data", { mode: "json" }).notNull(),
  createdAt: text("created_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

const dataItemsRelations = relations(dataItems, ({ one }) => ({
  catalogueData: one(catalogueData, {
    fields: [dataItems.catalogueDataId],
    references: [catalogueData.id],
  }),
  extractionStepItem: one(extractionStepItems, {
    fields: [dataItems.extractionStepItemId],
    references: [extractionStepItems.id],
  }),
}));

const settings = sqliteTable("settings", {
  key: text("key").primaryKey().notNull(),
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
  catalogueData,
  catalogueDataRelations,
  catalogues,
  cataloguesRelations,
  dataItems,
  dataItemsRelations,
  extractionLogs,
  extractionLogsRelations,
  extractions,
  extractionsRelations,
  extractionStepItems,
  extractionStepItemsRelations,
  extractionSteps,
  extractionStepsRelations,
  recipes,
  recipesRelations,
  settings,
  users,
};

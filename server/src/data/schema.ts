import { relations, sql } from "drizzle-orm";
import {
  AnyPgColumn,
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";
import { promises as fs } from "fs";
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import path from "path";
import { promisify } from "util";
import { gunzip as syncGunzip, gzip as syncGzip } from "zlib";
import { SimplifiedMarkdown } from "../types";
const gzip = promisify(syncGzip);
const gunzip = promisify(syncGunzip);

if (!process.env.ENCRYPTION_KEY)
  throw new Error("Please define an encryption key.");

export const ENCRYPTION_KEY: string = process.env.ENCRYPTION_KEY;

export function toDbEnum(myEnum: any): [string, ...string[]] {
  return Object.values(myEnum).map((value: any) => `${value}`) as [
    string,
    ...string[],
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

export enum Provider {
  OpenAI = "openai",
}

export enum ProviderModel {
  Gpt4o = "gpt-4o",
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

export interface FetchFailureReason {
  responseStatus?: number;
  reason: string;
}

export interface CourseStructuredData {
  course_id: string;
  course_name: string;
  course_description: string;
  course_credits_min?: number;
  course_credits_max?: number;
  course_credits_type?: string;
  course_prerequisites?: string;
}

export type TextInclusion = {
  [K in keyof CourseStructuredData]: { full: boolean };
};

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

export interface CostCallSite {
  callSite: string;
  totalInputTokens: number;
  totalOutputTokens: number;
  estimatedCost: number;
}

export interface CostSummary {
  totalInputTokens: number;
  totalOutputTokens: number;
  callSites: CostCallSite[];
  estimatedCost: number;
}

export interface CompletionStats {
  costs?: CostSummary;
  steps: StepCompletionStats[];
  generatedAt: string;
}

export function getSqliteTimestamp() {
  return sql`CURRENT_TIMESTAMP`;
}

async function createStepDirectory(
  basePath: string,
  extractionId: number,
  crawlStepId: number
): Promise<string> {
  if (!basePath) {
    throw new Error("EXTRACTION_FILES_PATH environment variable is not set");
  }

  const dirPath = path.join(
    basePath,
    extractionId.toString(),
    crawlStepId.toString()
  );

  await fs.mkdir(dirPath, { recursive: true });
  return dirPath;
}

export async function storeContent(
  extractionId: number,
  crawlStepId: number,
  crawlPageId: number,
  content: string,
  markdownContent: string
): Promise<string | null> {
  const basePath = process.env.EXTRACTION_FILES_PATH;
  const dirPath = await createStepDirectory(
    basePath!,
    extractionId,
    crawlStepId
  );
  const htmlFilePath = path.join(dirPath, `${crawlPageId}.html.gz`);
  const mdFilePath = path.join(dirPath, `${crawlPageId}.md.gz`);

  const gzippedHtml = await gzip(content);
  await fs.writeFile(htmlFilePath, gzippedHtml);

  const gzippedMd = await gzip(markdownContent);
  await fs.writeFile(mdFilePath, gzippedMd);

  return htmlFilePath;
}

export async function storeScreenshot(
  extractionId: number,
  crawlStepId: number,
  crawlPageId: number,
  screenshot: Buffer | undefined
): Promise<string | null> {
  if (!screenshot) {
    return null;
  }

  const basePath = process.env.EXTRACTION_FILES_PATH;

  try {
    const dirPath = await createStepDirectory(
      basePath!,
      extractionId,
      crawlStepId
    );
    const screenshotFilePath = path.join(dirPath, `${crawlPageId}.png.gz`);

    const gzippedScreenshot = await gzip(screenshot);
    await fs.writeFile(screenshotFilePath, gzippedScreenshot);
    return screenshotFilePath;
  } catch (error) {
    console.error("Error storing screenshot:", error);
    return null;
  }
}

export async function readContent(
  extractionId: number,
  crawlStepId: number,
  crawlPageId: number
): Promise<string> {
  const basePath = process.env.EXTRACTION_FILES_PATH;
  const filePath = path.join(
    basePath!,
    extractionId.toString(),
    crawlStepId.toString(),
    `${crawlPageId}.html.gz`
  );
  const compressedContent = await fs.readFile(filePath);
  const decompressedContent = await gunzip(compressedContent);
  return decompressedContent.toString();
}

export async function readMarkdownContent(
  extractionId: number,
  crawlStepId: number,
  crawlPageId: number
): Promise<SimplifiedMarkdown> {
  const basePath = process.env.EXTRACTION_FILES_PATH;
  const filePath = path.join(
    basePath!,
    extractionId.toString(),
    crawlStepId.toString(),
    `${crawlPageId}.md.gz`
  );
  const compressedContent = await fs.readFile(filePath);
  const decompressedContent = await gunzip(compressedContent);
  return decompressedContent.toString() as SimplifiedMarkdown;
}

export async function readScreenshot(
  extractionId: number,
  crawlStepId: number,
  crawlPageId: number
): Promise<string> {
  const basePath = process.env.EXTRACTION_FILES_PATH;
  const filePath = path.join(
    basePath!,
    extractionId.toString(),
    crawlStepId.toString(),
    `${crawlPageId}.png.gz`
  );
  const compressedContent = await fs.readFile(filePath);
  const decompressedContent = await gunzip(compressedContent);
  return decompressedContent.toString("base64");
}

// Define enums using pgEnum
export const pageTypeEnum = pgEnum("page_type", toDbEnum(PageType));
export const urlPatternTypeEnum = pgEnum("url_pattern_type", [
  "page_num",
  "offset",
]);
export const logLevelEnum = pgEnum("log_level", toDbEnum(LogLevel));
export const providerEnum = pgEnum("provider", toDbEnum(Provider));
export const providerModelEnum = pgEnum(
  "provider_model",
  toDbEnum(ProviderModel)
);
export const extractionStatusEnum = pgEnum(
  "extraction_status",
  toDbEnum(ExtractionStatus)
);
export const pageStatusEnum = pgEnum("page_status", toDbEnum(PageStatus));
export const recipeDetectionStatusEnum = pgEnum(
  "recipe_detection_status",
  toDbEnum(RecipeDetectionStatus)
);
export const stepEnum = pgEnum("step", toDbEnum(Step));

const catalogues = pgTable("catalogues", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  url: text("url").notNull().unique(),
  thumbnailUrl: text("thumbnail_url"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

const cataloguesRelations = relations(catalogues, ({ many }) => ({
  recipes: many(recipes),
}));

const recipes = pgTable(
  "recipes",
  {
    id: serial("id").primaryKey(),
    isDefault: boolean("is_default").default(false).notNull(),
    catalogueId: integer("catalogue_id")
      .notNull()
      .references(() => catalogues.id, { onDelete: "cascade" }),
    url: text("url").notNull(),
    configuration: jsonb("configuration")
      .$type<RecipeConfiguration>()
      .notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    detectionFailureReason: text("detection_failure_reason"),
    status: recipeDetectionStatusEnum("status")
      .notNull()
      .default(RecipeDetectionStatus.WAITING),
  },
  (t) => ({
    catalogueIdx: index("recipes_catalogue_idx").on(t.catalogueId),
  })
);

const recipesRelations = relations(recipes, ({ one, many }) => ({
  catalogue: one(catalogues, {
    fields: [recipes.catalogueId],
    references: [catalogues.id],
  }),
  extractions: many(extractions),
}));

const extractions = pgTable(
  "extractions",
  {
    id: serial("id").primaryKey(),
    recipeId: integer("recipe_id")
      .notNull()
      .references(() => recipes.id, { onDelete: "cascade" }),
    completionStats: jsonb("completion_stats").$type<CompletionStats>(),
    status: extractionStatusEnum("status")
      .notNull()
      .default(ExtractionStatus.WAITING),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => ({
    recipeIdx: index("extractions_recipe_idx").on(t.recipeId),
  })
);

const extractionsRelations = relations(extractions, ({ one, many }) => ({
  recipe: one(recipes, {
    fields: [extractions.recipeId],
    references: [recipes.id],
  }),
  crawlSteps: many(crawlSteps),
  crawlPages: many(crawlPages),
  dataset: many(datasets),
  logs: many(extractionLogs),
  modelApiCalls: many(modelApiCalls),
}));

const modelApiCalls = pgTable(
  "model_api_calls",
  {
    id: serial("id").primaryKey(),
    extractionId: integer("extraction_id").references(() => extractions.id, {
      onDelete: "cascade",
    }),
    provider: providerEnum("provider").notNull(),
    model: providerModelEnum("model").notNull(),
    callSite: text("call_site").notNull(),
    input_token_count: integer("input_token_count").notNull(),
    output_token_count: integer("output_token_count").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => ({
    extractionIdx: index("model_api_calls_extraction_idx").on(t.extractionId),
  })
);

const modelApiCallsRelations = relations(modelApiCalls, ({ one }) => ({
  extraction: one(extractions, {
    fields: [modelApiCalls.extractionId],
    references: [extractions.id],
  }),
}));

const extractionLogs = pgTable(
  "extraction_logs",
  {
    id: serial("id").primaryKey(),
    extractionId: integer("extraction_id")
      .notNull()
      .references(() => extractions.id, { onDelete: "cascade" }),
    log: text("log").notNull(),
    logLevel: logLevelEnum("log_level").notNull().default(LogLevel.INFO),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => ({
    extractionIdx: index("extraction_logs_extraction_idx").on(t.extractionId),
  })
);

const extractionLogsRelations = relations(extractionLogs, ({ one }) => ({
  extraction: one(extractions, {
    fields: [extractionLogs.extractionId],
    references: [extractions.id],
  }),
}));

const crawlSteps = pgTable(
  "crawl_steps",
  {
    id: serial("id").primaryKey(),
    extractionId: integer("extraction_id")
      .notNull()
      .references(() => extractions.id, { onDelete: "cascade" }),
    step: stepEnum("step").notNull(),
    parentStepId: integer("parent_step_id").references(
      (): AnyPgColumn => crawlSteps.id,
      {
        onDelete: "cascade",
      }
    ),
    configuration: jsonb("configuration")
      .$type<RecipeConfiguration>()
      .notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => ({
    extractionIdx: index("crawl_steps_extraction_idx").on(t.extractionId),
    parentStepIdx: index("crawl_steps_parent_step_idx").on(t.parentStepId),
  })
);

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

const crawlPages = pgTable(
  "crawl_pages",
  {
    id: serial("id").primaryKey(),
    extractionId: integer("extraction_id")
      .notNull()
      .references(() => extractions.id, { onDelete: "cascade" }),
    crawlStepId: integer("crawl_step_id")
      .notNull()
      .references(() => crawlSteps.id, { onDelete: "cascade" }),
    status: pageStatusEnum("status").notNull().default(PageStatus.WAITING),
    url: text("url").notNull(),
    content: text("content"),
    screenshot: text("screenshot"),
    fetchFailureReason: jsonb(
      "fetch_failure_reason"
    ).$type<FetchFailureReason>(),
    dataType: pageTypeEnum("data_type"),
    dataExtractionStartedAt: timestamp("data_extraction_started_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => ({
    uniq: unique().on(t.extractionId, t.url),
    extractionIdx: index("crawl_pages_extraction_idx").on(t.extractionId),
    statusIdx: index("crawl_pages_status_idx").on(t.status),
    dataTypeIdx: index("crawl_pages_data_type_idx").on(t.dataType),
    stepIdx: index("crawl_pages_step_idx").on(t.crawlStepId),
  })
);

const crawlPageRelations = relations(crawlPages, ({ one, many }) => ({
  crawlStep: one(crawlSteps, {
    fields: [crawlPages.crawlStepId],
    references: [crawlSteps.id],
  }),
  extraction: one(extractions, {
    fields: [crawlPages.extractionId],
    references: [extractions.id],
  }),
  dataItems: many(dataItems),
}));

const datasets = pgTable(
  "datasets",
  {
    id: serial("id").primaryKey(),
    catalogueId: integer("catalogue_id")
      .notNull()
      .references(() => catalogues.id, { onDelete: "cascade" }),
    extractionId: integer("extraction_id")
      .notNull()
      .references(() => extractions.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => ({
    uniq: unique().on(t.catalogueId, t.extractionId),
    catalogueIdx: index("datasets_catalogue_idx").on(t.catalogueId),
    extractionIdx: index("datasets_extraction_idx").on(t.extractionId),
  })
);

const datasetsRelations = relations(datasets, ({ one, many }) => ({
  extraction: one(extractions, {
    fields: [datasets.extractionId],
    references: [extractions.id],
  }),
  dataItems: many(dataItems),
}));

const dataItems = pgTable(
  "data_items",
  {
    id: serial("id").primaryKey(),
    datasetId: integer("dataset_id")
      .notNull()
      .references(() => datasets.id, { onDelete: "cascade" }),
    crawlPageId: integer("crawl_page_id").references(() => crawlPages.id, {
      onDelete: "cascade",
    }),
    structuredData: jsonb("structured_data")
      .$type<CourseStructuredData>()
      .notNull(),
    textInclusion: jsonb("text_inclusion").$type<TextInclusion>(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => ({
    datasetIdx: index("data_items_dataset_idx").on(t.datasetId),
    crawlPageIdx: index("data_items_crawl_page_idx").on(t.crawlPageId),
  })
);

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

const settings = pgTable("settings", {
  key: text("key").primaryKey().notNull().unique(),
  value: text("value").notNull(),
  isEncrypted: boolean("is_encrypted").default(false).notNull(),
  encryptedPreview: text("encrypted_preview"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
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
  modelApiCalls,
  modelApiCallsRelations,
  recipes,
  recipesRelations,
  settings,
  users,
};

import { eq } from "drizzle-orm";
import { sql } from "drizzle-orm/sql/sql";
import db from "../data";
import {
  EXTRACTION_LOG_LEVELS,
  EXTRACTION_STATUSES,
  RecipeConfiguration,
  STEPS,
  STEP_ITEM_STATUSES,
  STEP_STATUSES,
  crawlPages,
  crawlSteps,
  extractionLogs,
  extractions,
} from "../data/schema";

export async function createExtraction(recipeId: number) {
  const result = await db
    .insert(extractions)
    .values({
      recipeId,
      status: EXTRACTION_STATUSES.IN_PROGRESS,
    })
    .returning();
  return result[0];
}

export async function createExtractionLog(
  extractionId: number,
  log: string,
  logLevel: EXTRACTION_LOG_LEVELS = EXTRACTION_LOG_LEVELS.INFO
) {
  const result = await db
    .insert(extractionLogs)
    .values({
      extractionId,
      log,
      logLevel,
    })
    .returning();
  return result[0];
}

export async function getExtractionCount() {
  const result = await db
    .select({ count: sql<number>`count(*)` })
    .from(extractions);
  return result[0].count;
}

export async function getPageCount(stepId: number) {
  const result = await db
    .select({ count: sql<number>`count(*)` })
    .from(crawlPages)
    .where(eq(crawlPages.crawlStepId, stepId));
  return result[0].count;
}

export async function findExtractions(limit: number = 20, offset?: number) {
  offset = offset || 0;
  return db.query.extractions.findMany({
    limit,
    offset,
    with: {
      recipe: {
        with: {
          catalogue: true,
        },
      },
    },
    orderBy: (extractions, { desc }) => desc(extractions.createdAt),
  });
}

export async function findExtractionById(id: number) {
  const result = await db.query.extractions.findFirst({
    where: (catalogues, { eq }) => eq(catalogues.id, id),
    with: {
      recipe: {
        with: {
          catalogue: true,
        },
      },
      crawlSteps: {
        orderBy: (e) => e.createdAt,
        extras: {
          itemCount: sql<number>`0`.as("item_count"),
        },
      },
      logs: {
        orderBy: (e) => e.createdAt,
      },
    },
  });
  if (result) {
    for (const step of result.crawlSteps) {
      step.itemCount = await getPageCount(step.id);
    }
  }
  return result;
}

export async function findLogs(
  extractionId: number,
  limit: number = 20,
  offset?: number
) {
  return db.query.extractionLogs.findMany({
    where: (logs, { eq }) => eq(logs.extractionId, extractionId),
    limit,
    offset,
    orderBy: (logs, { desc }) => desc(logs.createdAt),
  });
}

export async function getLogCount(extractionId: number) {
  const result = await db
    .select({ count: sql<number>`count(*)` })
    .from(extractionLogs)
    .where(eq(extractionLogs.extractionId, extractionId));
  return result[0].count;
}

export async function findStep(stepId: number) {
  const result = await db.query.crawlSteps.findFirst({
    where: (steps, { eq }) => eq(steps.id, stepId),
  });
  return result;
}

export async function findPages(stepId: number) {
  const result = await db.query.crawlPages.findMany({
    where: (crawlPages, { eq }) => eq(crawlPages.crawlStepId, stepId),
    orderBy: (crawlPages) => crawlPages.createdAt,
  });
  return result;
}

export async function findPagesPaginated(
  stepId: number,
  limit: number = 20,
  offset?: number
) {
  offset = offset || 0;
  const result = await db.query.crawlPages.findMany({
    columns: {
      content: false,
      screenshot: false,
    },
    limit,
    offset,
    where: (crawlPages, { eq }) => eq(crawlPages.crawlStepId, stepId),
    orderBy: (crawlPages) => crawlPages.createdAt,
  });
  return result;
}

export async function findPage(crawlPageId: number) {
  const result = await db.query.crawlPages.findFirst({
    where: (crawlPages, { eq }) => eq(crawlPages.id, crawlPageId),
  });
  return result;
}

export async function findPageForJob(crawlPageId: number) {
  const result = await db.query.crawlPages.findFirst({
    where: (crawlPages, { eq }) => eq(crawlPages.id, crawlPageId),
    with: {
      crawlStep: {
        with: {
          extraction: {
            with: {
              recipe: true,
            },
          },
        },
      },
    },
  });
  if (!result) {
    throw new Error(`Step item ${crawlPageId} not found`);
  }
  return result;
}

export interface CreateStepOptions {
  extractionId: number;
  step: STEPS;
  parentStepId?: number;
  configuration: RecipeConfiguration;
}

export async function createStep({
  extractionId,
  step,
  parentStepId,
  configuration,
}: CreateStepOptions) {
  const result = await db
    .insert(crawlSteps)
    .values({
      extractionId,
      step,
      parentStepId,
      configuration,
      status: STEP_STATUSES.IN_PROGRESS,
    })
    .returning();
  return result[0];
}

export interface CreatePageOptions {
  crawlStepId: number;
  url: string;
  dataType: string;
  content?: string;
  screenshot?: string;
  status?: STEP_ITEM_STATUSES;
}

export async function createPage({
  crawlStepId,
  url,
  content,
  dataType,
  status,
  screenshot,
}: CreatePageOptions) {
  const result = await db
    .insert(crawlPages)
    .values({
      crawlStepId,
      content,
      dataType,
      url,
      screenshot,
      status: status || STEP_ITEM_STATUSES.WAITING,
    })
    .returning();
  return result[0];
}

export async function updatePage(
  crawlPageId: number,
  status?: STEP_ITEM_STATUSES,
  content?: string,
  screenshot?: string
) {
  const result = await db
    .update(crawlPages)
    .set({
      status,
      content,
      screenshot,
    })
    .where(eq(crawlPages.id, crawlPageId))
    .returning();
  return result[0];
}

export async function updatePageStatus(
  crawlPageId: number,
  status: STEP_ITEM_STATUSES
) {
  const result = await db
    .update(crawlPages)
    .set({
      status,
    })
    .where(eq(crawlPages.id, crawlPageId))
    .returning();
  return result[0];
}

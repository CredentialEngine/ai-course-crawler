import { eq } from "drizzle-orm";
import { sql } from "drizzle-orm/sql/sql";
import db from "../data";
import {
  EXTRACTION_LOG_LEVELS,
  EXTRACTION_STATUSES,
  NavigationData,
  STEPS,
  STEP_ITEM_STATUSES,
  STEP_STATUSES,
  extractionLogs,
  extractionStepItems,
  extractionSteps,
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

export async function getStepItemCount(stepId: number) {
  const result = await db
    .select({ count: sql<number>`count(*)` })
    .from(extractionStepItems)
    .where(eq(extractionStepItems.extractionStepId, stepId));
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
      extractionSteps: {
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
    for (const step of result.extractionSteps) {
      step.itemCount = await getStepItemCount(step.id);
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
  const result = await db.query.extractionSteps.findFirst({
    where: (steps, { eq }) => eq(steps.id, stepId),
  });
  return result;
}

export async function findStepItems(stepId: number) {
  const result = await db.query.extractionStepItems.findMany({
    where: (stepItems, { eq }) => eq(stepItems.extractionStepId, stepId),
    orderBy: (stepItems) => stepItems.createdAt,
  });
  return result;
}

export async function findStepItemsPaginated(
  stepId: number,
  limit: number = 20,
  offset?: number
) {
  offset = offset || 0;
  const result = await db.query.extractionStepItems.findMany({
    columns: {
      content: false,
      screenshot: false,
    },
    limit,
    offset,
    where: (stepItems, { eq }) => eq(stepItems.extractionStepId, stepId),
    orderBy: (stepItems) => stepItems.createdAt,
  });
  return result;
}

export async function findStepItem(stepItemId: number) {
  const result = await db.query.extractionStepItems.findFirst({
    where: (stepItems, { eq }) => eq(stepItems.id, stepItemId),
  });
  return result;
}

export async function createStep(
  extractionId: number,
  step: STEPS,
  parentStepId?: number,
  configuration?: Record<string, any>
) {
  const result = await db
    .insert(extractionSteps)
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

export async function createStepItem(
  extractionStepId: number,
  url: string,
  content: string,
  dataType: string,
  status?: STEP_ITEM_STATUSES,
  screenshot?: string,
  metadata?: Record<string, any>,
  navigationData?: NavigationData
) {
  const result = await db
    .insert(extractionStepItems)
    .values({
      extractionStepId,
      content,
      dataType,
      url,
      screenshot,
      status: status || STEP_ITEM_STATUSES.SUCCESS,
      metadata,
      navigationData,
    })
    .returning();
  return result[0];
}

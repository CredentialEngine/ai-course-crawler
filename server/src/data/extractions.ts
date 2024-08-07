import { and, eq, isNotNull } from "drizzle-orm";
import { sql } from "drizzle-orm/sql/sql";
import { SQLiteUpdateSetSource } from "drizzle-orm/sqlite-core";
import db from "../data";
import {
  LogLevel,
  PageStatus,
  PageType,
  RecipeConfiguration,
  Step,
  crawlPages,
  crawlSteps,
  dataItems,
  extractionLogs,
  extractions,
} from "../data/schema";

export async function createExtraction(recipeId: number) {
  const result = await db
    .insert(extractions)
    .values({
      recipeId,
    })
    .returning();
  return result[0];
}

export async function updateExtraction(
  extractionId: number,
  updateAttributes: SQLiteUpdateSetSource<typeof extractions>
) {
  const result = await db
    .update(extractions)
    .set(updateAttributes)
    .where(eq(extractions.id, extractionId))
    .returning();
  return result[0];
}

export async function createExtractionLog(
  extractionId: number,
  log: string,
  logLevel: LogLevel = LogLevel.INFO
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
  return db.query.extractions.findFirst({
    where: (catalogues, { eq }) => eq(catalogues.id, id),
    with: {
      recipe: {
        with: {
          catalogue: true,
        },
      },
      crawlSteps: {
        orderBy: (e) => e.createdAt,
      },
    },
  });
}

export async function findExtractionForDetailPage(id: number) {
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
  step: Step;
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
  status?: PageStatus;
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
      status: status || PageStatus.WAITING,
    })
    .returning();
  return result[0];
}

export interface CreateStepAndPagesOptions {
  extractionId: number;
  step: Step;
  parentStepId?: number;
  configuration: RecipeConfiguration;
  pageType: PageType;
  pages: {
    url: string;
  }[];
}

export async function createStepAndPages(
  createOptions: CreateStepAndPagesOptions
) {
  return await db.transaction(async (tx) => {
    const step = (
      await tx
        .insert(crawlSteps)
        .values({
          extractionId: createOptions.extractionId,
          step: createOptions.step,
          parentStepId: createOptions.parentStepId,
          configuration: createOptions.configuration,
        })
        .returning()
    )[0];
    const pages = await tx
      .insert(crawlPages)
      .values(
        createOptions.pages.map((pageCreateOptions) => ({
          crawlStepId: step.id,
          url: pageCreateOptions.url,
          dataType: createOptions.pageType,
        }))
      )
      .returning();
    return {
      step,
      pages,
    };
  });
}

export async function updatePage(
  crawlPageId: number,
  updateAttributes: SQLiteUpdateSetSource<typeof crawlPages>
) {
  const result = await db
    .update(crawlPages)
    .set(updateAttributes)
    .where(eq(crawlPages.id, crawlPageId))
    .returning();
  return result[0];
}

export async function getStepStats(crawlStepId: number) {
  return await db
    .select({
      crawlPageId: crawlPages.id,
      status: crawlPages.status,
      dataExtractionStartedAt: crawlPages.dataExtractionStartedAt,
      dataItemCount: sql<number>`COUNT(${dataItems.id})`,
    })
    .from(crawlPages)
    .leftJoin(dataItems, eq(dataItems.crawlPageId, crawlPages.id))
    .where(
      and(
        eq(crawlPages.crawlStepId, crawlStepId),
        eq(crawlPages.dataType, PageType.COURSE_DETAIL_PAGE)
      )
    )
    .groupBy(crawlPages.id);
}

export async function findFailedAndNoDataPageIds(crawlStepId: number) {
  // Pages where a data extraction was attempted, but no data was found
  const noDataPageIds = await db
    .select({
      id: crawlPages.id,
    })
    .from(crawlPages)
    .leftJoin(dataItems, eq(dataItems.crawlPageId, crawlPages.id))
    .where(
      and(
        eq(crawlPages.crawlStepId, crawlStepId),
        eq(crawlPages.status, PageStatus.SUCCESS),
        eq(crawlPages.dataType, PageType.COURSE_DETAIL_PAGE),
        isNotNull(crawlPages.dataExtractionStartedAt)
      )
    )
    .groupBy(crawlPages.id)
    .having(sql`count(${dataItems.id}) = 0`);

  // Pages where the download failed
  const failedIds = await db
    .select({
      id: crawlPages.id,
    })
    .from(crawlPages)
    .where(
      and(
        eq(crawlPages.crawlStepId, crawlStepId),
        eq(crawlPages.status, PageStatus.ERROR)
      )
    );

  return [
    ...new Set(
      noDataPageIds.map((p) => p.id).concat(failedIds.map((p) => p.id))
    ),
  ];
}

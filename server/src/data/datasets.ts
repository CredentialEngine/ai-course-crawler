import { and, desc, eq, sql } from "drizzle-orm";
import db from ".";
import {
  crawlPages,
  crawlSteps,
  dataItems,
  datasets,
  extractions,
} from "./schema";

export async function createDataItem(
  crawlPageId: number,
  datasetId: number,
  structuredData: Record<string, any>
) {
  const result = await db
    .insert(dataItems)
    .values({
      crawlPageId,
      datasetId,
      structuredData,
    })
    .returning();
  return result[0];
}

export async function findOrCreateDataset(
  catalogueId: number,
  extractionId: number
) {
  await db
    .insert(datasets)
    .values({ catalogueId, extractionId })
    .onConflictDoNothing();
  return db.query.datasets.findFirst({
    where: (datasets, { eq }) =>
      and(
        eq(datasets.catalogueId, catalogueId),
        eq(datasets.extractionId, extractionId)
      ),
  });
}

export async function findCataloguesWithData(
  limit: number = 20,
  offset: number = 0
) {
  const totalItems = (
    await db
      .select({
        totalCatalogueIds: sql<number>`count(distinct catalogue_id)`,
      })
      .from(datasets)
  )[0].totalCatalogueIds;

  const catalogueIdsQuery = db
    .selectDistinct({
      catalogueId: datasets.catalogueId,
    })
    .from(datasets)
    .limit(limit)
    .offset(offset);

  const items = await db.query.catalogues.findMany({
    where: (catalogues, { inArray }) =>
      inArray(catalogues.id, catalogueIdsQuery),
  });
  return { totalItems, items };
}

export async function getItemsCount(extractionId: number) {
  return (
    await db
      .select({ count: sql<number>`count(*)` })
      .from(datasets)
      .innerJoin(dataItems, eq(datasets.id, dataItems.datasetId))
      .where(eq(datasets.extractionId, extractionId))
  )[0].count;
}

export async function findDatasets(
  catalogueId: number,
  limit: number = 20,
  offset: number = 0
) {
  const totalItems = (
    await db
      .select({ count: sql<number>`count(*)` })
      .from(datasets)
      .where(eq(datasets.catalogueId, catalogueId))
  )[0].count;

  let datasetsQuery = db
    .select({
      id: datasets.extractionId,
      createdAt: datasets.createdAt,
    })
    .from(datasets)
    .where(eq(datasets.catalogueId, catalogueId))
    .orderBy(desc(datasets.createdAt))
    .limit(limit)
    .offset(offset)
    .$dynamic();

  const items = await Promise.all(
    (
      await datasetsQuery
    ).map(async (dataset) => ({
      ...dataset,
      itemsCount: await getItemsCount(dataset.id),
    }))
  );

  return { totalItems, items };
}

export async function findDataItems(
  extractionId: number,
  limit: number = 20,
  offset: number = 0
) {
  const totalItems = await getItemsCount(extractionId);

  const items = await db
    .select({
      id: dataItems.id,
      structuredData: dataItems.structuredData,
    })
    .from(dataItems)
    .innerJoin(crawlPages, eq(crawlPages.id, dataItems.crawlPageId))
    .innerJoin(crawlSteps, eq(crawlSteps.id, crawlPages.crawlStepId))
    .innerJoin(extractions, eq(extractions.id, crawlSteps.extractionId))
    .where(eq(crawlSteps.extractionId, extractionId))
    .limit(limit)
    .offset(offset);

  return { totalItems, items };
}

export async function findAllDataItems(extractionId: number) {
  const items = await db
    .select()
    .from(dataItems)
    .innerJoin(crawlPages, eq(crawlPages.id, dataItems.crawlPageId))
    .innerJoin(crawlSteps, eq(crawlSteps.id, crawlPages.crawlStepId))
    .innerJoin(extractions, eq(extractions.id, crawlSteps.extractionId))
    .where(eq(crawlSteps.extractionId, extractionId));

  return items;
}

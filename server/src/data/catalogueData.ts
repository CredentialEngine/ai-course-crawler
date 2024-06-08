import { desc, eq, sql } from "drizzle-orm";
import db from ".";
import {
  catalogueData,
  catalogues,
  dataItems,
  extractions,
  recipes,
} from "./schema";

export async function findCatalogueData(catalogueDataId: number) {
  return db.query.catalogueData.findFirst({
    where: eq(catalogueData.id, catalogueDataId),
    with: {
      extraction: {
        with: {
          recipe: {
            with: {
              catalogue: true,
            },
          },
        },
      },
    },
  });
}

export async function createCatalogueData(extractionId: number) {
  const result = await db
    .insert(catalogueData)
    .values({ extractionId })
    .returning();
  return result[0];
}

export async function findCatalogueForExtraction(extractionId: number) {
  const result = await db.query.catalogueData.findFirst({
    where: (catalogueData, { eq }) =>
      eq(catalogueData.extractionId, extractionId),
  });
  return result;
}

export async function findOrCreateCatalogueData(extractionId: number) {
  return (
    (await findCatalogueForExtraction(extractionId)) ||
    (await createCatalogueData(extractionId))
  );
}

export async function createDataItem(
  catalogueDataId: number,
  extractionStepItemId: number,
  structuredData: Record<string, any>
) {
  const result = await db
    .insert(dataItems)
    .values({
      catalogueDataId,
      extractionStepItemId,
      structuredData,
    })
    .returning();
  return result[0];
}

export async function findCataloguesWithData(
  limit: number = 20,
  offset?: number
) {
  const catalogueIdsQuery = db
    .select({
      catalogueId: catalogues.id,
    })
    .from(catalogueData)
    .innerJoin(extractions, eq(extractions.id, catalogueData.extractionId))
    .innerJoin(recipes, eq(recipes.id, extractions.recipeId))
    .innerJoin(catalogues, eq(catalogues.id, recipes.catalogueId))
    .groupBy(catalogues.id);

  const countQuery = await db
    .select({ count: sql<number>`count(distinct catalogues.id)` })
    .from(catalogueData)
    .innerJoin(extractions, eq(extractions.id, catalogueData.extractionId))
    .innerJoin(recipes, eq(recipes.id, extractions.recipeId))
    .innerJoin(catalogues, eq(catalogues.id, recipes.catalogueId))
    .groupBy(catalogues.id);

  const totalItems = countQuery[0].count || 0;

  const items = await db.query.catalogues.findMany({
    limit,
    offset,
    where: (catalogues, { inArray }) =>
      inArray(catalogues.id, catalogueIdsQuery),
  });
  return { totalItems, items };
}

export async function getDataItemsCount(catalogueDataId: number) {
  return (
    await db
      .select({ count: sql<number>`count(*)` })
      .from(dataItems)
      .where(eq(dataItems.catalogueDataId, catalogueDataId))
  )[0].count;
}

export async function findDatasetsForCatalogue(
  catalogueId: number,
  limit: number = 20,
  offset?: number
) {
  const totalItems = (
    await db
      .select({ count: sql<number>`count(distinct catalogue_data.id)` })
      .from(catalogueData)
      .innerJoin(extractions, eq(extractions.id, catalogueData.extractionId))
      .innerJoin(recipes, eq(recipes.id, extractions.recipeId))
      .innerJoin(catalogues, eq(catalogues.id, recipes.catalogueId))
      .where(eq(catalogues.id, catalogueId))
  )[0].count;

  let datasetsQuery = db
    .select({
      id: catalogueData.id,
      extractionId: catalogueData.extractionId,
      createdAt: catalogueData.createdAt,
    })
    .from(catalogueData)
    .innerJoin(extractions, eq(extractions.id, catalogueData.extractionId))
    .innerJoin(recipes, eq(recipes.id, extractions.recipeId))
    .innerJoin(catalogues, eq(catalogues.id, recipes.catalogueId))
    .orderBy(desc(catalogueData.createdAt))
    .where(eq(catalogues.id, catalogueId))
    .limit(limit)
    .$dynamic();

  if (offset) {
    datasetsQuery = datasetsQuery.offset(offset);
  }

  const items = await Promise.all(
    (
      await datasetsQuery
    ).map(async (dataset) => ({
      ...dataset,
      itemsCount: await getDataItemsCount(dataset.id),
    }))
  );

  return { totalItems, items };
}

export async function findDataItems(
  catalogueDataId: number,
  limit: number = 20,
  offset?: number
) {
  const totalItems = (
    await db
      .select({ count: sql<number>`count(*)` })
      .from(dataItems)
      .where(eq(dataItems.catalogueDataId, catalogueDataId))
  )[0].count;

  const items = await db.query.dataItems.findMany({
    where: (dataItems, { eq }) =>
      eq(dataItems.catalogueDataId, catalogueDataId),
    limit,
    offset,
  });

  return { totalItems, items };
}

export async function findAllDataItems(catalogueDataId: number) {
  const items = await db.query.dataItems.findMany({
    where: (dataItems, { eq }) =>
      eq(dataItems.catalogueDataId, catalogueDataId),
    with: {
      extractionStepItem: true,
    },
  });

  return items;
}

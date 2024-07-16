import { InferSelectModel, eq } from "drizzle-orm";
import db, { getSqliteTimestamp } from "../data";
import { PAGE_DATA_TYPE, RecipeConfiguration, recipes } from "../data/schema";

export type Recipe = Omit<InferSelectModel<typeof recipes>, "configuration"> & {
  configuration?: RecipeConfiguration;
};

export async function findRecipes() {
  return db.select().from(recipes);
}

export async function findDefaultRecipe(catalogueId: number) {
  return db.query.recipes.findFirst({
    where: (recipes, { eq }) =>
      eq(recipes.catalogueId, catalogueId) && eq(recipes.isDefault, true),
  });
}

export async function maybeSetDefault(catalogueId: number, recipeId: number) {
  const defaultExists = await findDefaultRecipe(catalogueId);
  if (defaultExists) {
    return;
  }
  const result = await db
    .update(recipes)
    .set({ isDefault: true })
    .where(eq(recipes.id, recipeId))
    .returning();
  return result[0];
}

export async function setDefault(recipeId: number) {
  const result = await db.transaction(async (tx) => {
    await tx.update(recipes).set({ isDefault: false });

    return tx
      .update(recipes)
      .set({ isDefault: true })
      .where(eq(recipes.id, recipeId))
      .returning();
  });
  return result[0];
}

export async function findRecipeById(id: number): Promise<undefined | Recipe> {
  const recipe = await db.query.recipes.findFirst({
    where: (recipes, { eq }) => eq(recipes.id, id),
  });
  return recipe as undefined | Recipe;
}

export async function startRecipe(
  catalogueId: number,
  url: string,
  rootPageType: PAGE_DATA_TYPE
) {
  const result = await db
    .insert(recipes)
    .values({
      catalogueId,
      url,
      isDefault: false,
      configuration: {
        pageType: rootPageType,
      },
      detectionStartedAt: getSqliteTimestamp(),
    })
    .returning({ id: recipes.id });
  return result[0];
}

export async function updateRecipe(
  recipeId: number,
  url: string,
  configuration?: RecipeConfiguration
) {
  const result = await db
    .update(recipes)
    .set({
      url,
      configuration,
    })
    .where(eq(recipes.id, recipeId))
    .returning();
  return result[0];
}

export async function updateConfiguration(
  recipeId: number,
  configuration: RecipeConfiguration,
  setConfigured: boolean = true
) {
  const result = await db
    .update(recipes)
    .set({
      configuration,
      configuredAt: setConfigured ? getSqliteTimestamp() : undefined,
    })
    .where(eq(recipes.id, recipeId))
    .returning();
  return result[0];
}

export async function updateStatus(
  recipeId: number,
  status: "configured" | "detecting"
) {
  const configuredAt = status == "configured" ? getSqliteTimestamp() : null;
  const detectionStartedAt =
    status == "detecting" ? getSqliteTimestamp() : null;

  const result = await db
    .update(recipes)
    .set({
      configuredAt,
      detectionStartedAt,
    })
    .where(eq(recipes.id, recipeId))
    .returning();
  return result[0];
}

export async function setDetectionStarted(recipeId: number) {
  const result = await db
    .update(recipes)
    .set({
      configuredAt: null,
      detectionStartedAt: getSqliteTimestamp(),
    })
    .where(eq(recipes.id, recipeId))
    .returning();
  return result[0];
}

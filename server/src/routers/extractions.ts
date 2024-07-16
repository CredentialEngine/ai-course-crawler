import { z } from "zod";
import { error, publicProcedure, router } from ".";
import { AppErrors } from "../appErrors";
import { findCatalogueForExtraction } from "../data/catalogueData";
import { findCatalogueById } from "../data/catalogues";
import {
  createExtraction,
  createStep,
  createStepItem,
  findExtractionById,
  findExtractions,
  findLogs,
  findStep,
  findStepItem,
  findStepItemsPaginated,
  getExtractionCount,
  getLogCount,
  getStepItemCount,
} from "../data/extractions";
import { Recipe } from "../data/recipes";
import { STEPS } from "../data/schema";
import { simplifyHtml, toMarkdown } from "../extraction/browser";
import { Queues, submitJob } from "../workers";

async function startExtraction(recipe: Recipe) {
  const extraction = await createExtraction(recipe.id);
  const step = await createStep({
    extractionId: extraction.id,
    step: STEPS.FETCH_ROOT,
    configuration: recipe.configuration!,
  });
  const stepItem = await createStepItem({
    extractionStepId: step.id,
    url: recipe.url,
    dataType: recipe.configuration!.pageType,
  });
  submitJob(Queues.FetchPage, { stepItemId: stepItem.id });
  return extraction;
}

export const extractionsRouter = router({
  create: publicProcedure
    .input(
      z.object({
        catalogueId: z.number().positive(),
        recipeId: z.number().positive(),
      })
    )
    .mutation(async (opts) => {
      const catalogue = await findCatalogueById(opts.input.catalogueId);
      if (!catalogue) {
        throw error("NOT_FOUND", AppErrors.NOT_FOUND, "Catalogue not found");
      }
      const recipe = catalogue.recipes.find((r) => r.id == opts.input.recipeId);
      if (!recipe) {
        throw error("NOT_FOUND", AppErrors.NOT_FOUND, "Recipe not found");
      }
      if (!recipe.configuredAt) {
        throw error(
          "BAD_REQUEST",
          AppErrors.RECIPE_NOT_CONFIGURED,
          "Recipe hasn't been configured for extraction"
        );
      }
      return startExtraction(recipe as Recipe);
    }),
  detail: publicProcedure
    .input(
      z.object({
        id: z.number().int().positive(),
      })
    )
    .query(async (opts) => {
      const result = await findExtractionById(opts.input.id);
      if (!result) {
        throw error("NOT_FOUND", AppErrors.NOT_FOUND, "Extraction not found");
      }
      const withCatalogueData = {
        ...result,
        catalogueDataId: (await findCatalogueForExtraction(result.id))?.id,
      };
      return withCatalogueData;
    }),

  logs: publicProcedure
    .input(
      z.object({
        extractionId: z.number().int().positive(),
        page: z.number().int().positive().default(1),
        perPage: z.number().int().positive().default(10),
      })
    )
    .query(async (opts) => {
      const totalItems = await getLogCount(opts.input.extractionId);
      const totalPages = Math.ceil(totalItems / opts.input.perPage);
      const offset = opts.input.page * opts.input.perPage - opts.input.perPage;
      return {
        totalItems,
        totalPages,
        results: await findLogs(
          opts.input.extractionId,
          opts.input.perPage,
          offset
        ),
      };
    }),
  stepDetail: publicProcedure
    .input(
      z.object({
        stepId: z.number().int().positive(),
        page: z.number().int().positive().default(1),
      })
    )
    .query(async (opts) => {
      const extractionStep = await findStep(opts.input.stepId);
      if (!extractionStep) {
        throw error("NOT_FOUND", AppErrors.NOT_FOUND, "Step not found");
      }
      const totalItems = await getStepItemCount(opts.input.stepId);
      const totalPages = Math.ceil(totalItems / 20);
      const offset = opts.input.page * 20 - 20;
      const stepItems = await findStepItemsPaginated(
        extractionStep.id,
        20,
        offset
      );
      return {
        extractionStep,
        extractionStepItems: {
          totalItems,
          totalPages,
          results: stepItems,
        },
      };
    }),
  stepItemDetail: publicProcedure
    .input(
      z.object({
        stepItemId: z.number().int().positive(),
      })
    )
    .query(async (opts) => {
      const stepItem = await findStepItem(opts.input.stepItemId);
      if (!stepItem) {
        throw error("NOT_FOUND", AppErrors.NOT_FOUND, "Step item not found");
      }
      return {
        ...stepItem,
        simplifiedContent: stepItem.content
          ? await toMarkdown(await simplifyHtml(stepItem.content))
          : null,
      };
    }),
  list: publicProcedure
    .input(
      z
        .object({
          page: z.number().int().positive().default(1),
        })
        .default({})
    )
    .query(async (opts) => {
      const totalItems = await getExtractionCount();
      const totalPages = Math.ceil(totalItems / 20);
      return {
        totalItems,
        totalPages,
        results: await findExtractions(20, opts.input.page * 20 - 20),
      };
    }),
});

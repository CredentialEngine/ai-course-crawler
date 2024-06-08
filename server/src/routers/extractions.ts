import { z } from "zod";
import { error, publicProcedure, router } from ".";
import { AppErrors } from "../appErrors";
import { findCatalogueById } from "../data/catalogues";
import {
  createExtraction,
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
import { simplifyHtml, toMarkdown } from "../extraction/browser";
import { Queues, submitJob } from "../jobs";

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
      const extraction = await createExtraction(recipe.id);
      submitJob(Queues.ExtractCourseCatalogue, { extractionId: extraction.id });
    }),
  detail: publicProcedure
    .input(
      z.object({
        id: z.number().int().positive(),
      })
    )
    .query(async (opts) => {
      const result = findExtractionById(opts.input.id);
      if (!result) {
        throw error("NOT_FOUND", AppErrors.NOT_FOUND, "Extraction not found");
      }
      return result;
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
        simplifiedContent: await toMarkdown(
          await simplifyHtml(stepItem.content)
        ),
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

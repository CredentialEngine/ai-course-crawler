import { z } from "zod";
import { error, publicProcedure, router } from ".";
import { AppErrors } from "../appErrors";
import { findCatalogueById } from "../data/catalogues";
import { getItemsCount } from "../data/datasets";
import {
  createExtraction,
  createPage,
  createStep,
  findExtractionById,
  findExtractions,
  findLogs,
  findPage,
  findPagesPaginated,
  findStep,
  getExtractionCount,
  getLogCount,
  getPageCount,
} from "../data/extractions";
import { Recipe } from "../data/recipes";
import { RECIPE_DETECTION_STATUSES, STEPS } from "../data/schema";
import { simplifyHtml, toMarkdown } from "../extraction/browser";
import { Queues, submitJob } from "../workers";

async function startExtraction(recipe: Recipe) {
  const extraction = await createExtraction(recipe.id);
  const step = await createStep({
    extractionId: extraction.id,
    step: STEPS.FETCH_ROOT,
    configuration: recipe.configuration!,
  });
  const crawlPage = await createPage({
    crawlStepId: step.id,
    url: recipe.url,
    dataType: recipe.configuration!.pageType,
  });
  submitJob(Queues.FetchPage, { crawlPageId: crawlPage.id });
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
      if (recipe.status != RECIPE_DETECTION_STATUSES.SUCCESS) {
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
      let result = await findExtractionById(opts.input.id);
      if (!result) {
        throw error("NOT_FOUND", AppErrors.NOT_FOUND, "Extraction not found");
      }
      return {
        ...result,
        dataItemsCount: await getItemsCount(opts.input.id),
      };
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
      const crawlStep = await findStep(opts.input.stepId);
      if (!crawlStep) {
        throw error("NOT_FOUND", AppErrors.NOT_FOUND, "Step not found");
      }
      const totalItems = await getPageCount(opts.input.stepId);
      const totalPages = Math.ceil(totalItems / 20);
      const offset = opts.input.page * 20 - 20;
      const crawlPages = await findPagesPaginated(crawlStep.id, 20, offset);
      return {
        crawlStep,
        crawlPages: {
          totalItems,
          totalPages,
          results: crawlPages,
        },
      };
    }),
  crawlPageDetail: publicProcedure
    .input(
      z.object({
        crawlPageId: z.number().int().positive(),
      })
    )
    .query(async (opts) => {
      const crawlPage = await findPage(opts.input.crawlPageId);
      if (!crawlPage) {
        throw error("NOT_FOUND", AppErrors.NOT_FOUND, "Step item not found");
      }
      return {
        ...crawlPage,
        simplifiedContent: crawlPage.content
          ? await toMarkdown(await simplifyHtml(crawlPage.content))
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

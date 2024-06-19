import { z } from "zod";
import { error, publicProcedure, router } from ".";
import { AppErrors } from "../appErrors";
import {
  findRecipeById,
  setDefault,
  startRecipe,
  updateRecipe,
  updateStatus,
} from "../data/recipes";
import { PAGE_DATA_TYPE } from "../data/schema";
import { getBrowser, loadPage } from "../extraction/browser";
import { detectPageType } from "../extraction/detectPageType";
import { Queues, submitJob } from "../jobs";

export const recipesRouter = router({
  detail: publicProcedure
    .input(
      z.object({
        id: z.number().int().positive(),
      })
    )
    .query(async (opts) => {
      return findRecipeById(opts.input.id);
    }),
  create: publicProcedure
    .input(
      z.object({
        url: z.string().url(),
        catalogueId: z.number().int().positive(),
      })
    )
    .mutation(async (opts) => {
      const browser = await getBrowser();
      try {
        const { content, screenshot } = await loadPage(
          browser,
          opts.input.url,
          true
        );
        const pageType = await detectPageType(
          opts.input.url,
          content,
          screenshot!
        );
        let message: string | null = null;
        if (!pageType) {
          message =
            "Page was not detected as a course catalogue index. Defaulting to home page type: course links.";
        }
        const result = await startRecipe(
          opts.input.catalogueId,
          opts.input.url,
          PAGE_DATA_TYPE.COURSE_LINKS_PAGE
        );
        if (result) {
          const id = result.id;
          submitJob(Queues.DetectConfiguration, { recipeId: id });
          return {
            id,
            pageType,
            message,
          };
        }
        throw error(
          "INTERNAL_SERVER_ERROR",
          AppErrors.UNKNOWN,
          "Something went wrong when saving the recipe."
        );
      } finally {
        browser.close();
      }
    }),
  reconfigure: publicProcedure
    .input(
      z.object({
        id: z.number().int().positive(),
      })
    )
    .mutation(async (opts) => {
      const recipe = await findRecipeById(opts.input.id);
      if (!recipe) {
        throw error("NOT_FOUND", AppErrors.NOT_FOUND, "Recipe not found");
      }
      await updateStatus(opts.input.id, "detecting");
      submitJob(Queues.DetectConfiguration, { recipeId: opts.input.id });
    }),
  update: publicProcedure
    .input(
      z.object({
        id: z.number().int().positive(),
        update: z.object({
          url: z.string(),
          configuration: z
            .object({
              rootPageType: z.enum([
                PAGE_DATA_TYPE.COURSE_LINKS_PAGE,
                PAGE_DATA_TYPE.COURSE_DETAIL_PAGE,
                PAGE_DATA_TYPE.CATEGORY_PAGE,
              ]),
              pagination: z
                .object({
                  urlPatternType: z.enum(["page_num", "offset"]),
                  urlPattern: z.string(),
                  totalPages: z.number().positive(),
                })
                .optional(),
            })
            .optional(),
        }),
      })
    )
    .mutation(async (opts) => {
      const recipe = await findRecipeById(opts.input.id);
      if (!recipe) {
        throw error("NOT_FOUND", AppErrors.NOT_FOUND, "Recipe not found");
      }
      return updateRecipe(
        recipe.id,
        opts.input.update.url,
        opts.input.update.configuration
      );
    }),
  setDefault: publicProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async (opts) => {
      const recipe = await findRecipeById(opts.input.id);
      if (!recipe) {
        throw error("NOT_FOUND", AppErrors.NOT_FOUND, "Recipe not found");
      }
      return setDefault(opts.input.id);
    }),
});

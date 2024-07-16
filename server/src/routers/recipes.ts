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
import { Queues, submitJob } from "../workers";
import { bestOutOf } from "../workers/utils";

enum UrlPatternType {
  page_num = "page_num",
}

const PaginationConfigurationSchema = z.object({
  urlPatternType: z.nativeEnum(UrlPatternType),
  urlPattern: z.string(),
  totalPages: z.number(),
});

const RecipeConfigurationSchema = z.object({
  pageType: z.nativeEnum(PAGE_DATA_TYPE),
  linkRegexp: z.string().optional(),
  pagination: PaginationConfigurationSchema.optional(),
  links: z.lazy((): z.ZodSchema => RecipeConfigurationSchema).optional(),
});

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
        console.log(`Fetching ${opts.input.url}`);
        const { content, screenshot } = await loadPage(
          browser,
          opts.input.url,
          true
        );
        console.log(`Downloaded ${opts.input.url}.`);
        console.log(`Detecting page type`);
        let pageType = await bestOutOf(
          5,
          () => detectPageType(opts.input.url, content, screenshot!),
          (p) => p as string
        );
        console.log(`Detected page type: ${pageType}`);
        let message: string | null = null;
        if (!pageType) {
          message =
            "Page was not detected as a course catalogue index. Defaulting to home page type: course links.";
          pageType = PAGE_DATA_TYPE.COURSE_LINKS_PAGE;
        }
        console.log(`Creating recipe`);
        const result = await startRecipe(
          opts.input.catalogueId,
          opts.input.url,
          pageType
        );
        console.log(`Created recipe ${result.id}`);
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
          configuration: RecipeConfigurationSchema,
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

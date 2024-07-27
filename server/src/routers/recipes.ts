import { z } from "zod";
import { error, publicProcedure, router } from ".";
import { AppErrors } from "../appErrors";
import {
  findRecipeById,
  setDefault,
  startRecipe,
  updateRecipe,
} from "../data/recipes";
import { PageType } from "../data/schema";
import { fetchBrowserPage } from "../extraction/browser";
import { detectPageType } from "../extraction/detectPageType";
import { bestOutOf } from "../utils";
import { Queues, submitJob } from "../workers";

enum UrlPatternType {
  page_num = "page_num",
}

const PaginationConfigurationSchema = z.object({
  urlPatternType: z.nativeEnum(UrlPatternType),
  urlPattern: z.string(),
  totalPages: z.number(),
});

const RecipeConfigurationSchema = z.object({
  pageType: z.nativeEnum(PageType),
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
      console.log(`Fetching ${opts.input.url}`);
      const { content, screenshot } = await fetchBrowserPage(opts.input.url);
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
        pageType = PageType.COURSE_LINKS_PAGE;
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
        submitJob(
          Queues.DetectConfiguration,
          { recipeId: id },
          `detectConfiguration.${id}`
        );
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
      submitJob(
        Queues.DetectConfiguration,
        { recipeId: opts.input.id },
        `detectConfiguration.${recipe.id}`
      );
    }),
  update: publicProcedure
    .input(
      z.object({
        id: z.number().int().positive(),
        update: z.object({
          url: z.string(),
        }),
      })
    )
    .mutation(async (opts) => {
      const recipe = await findRecipeById(opts.input.id);
      if (!recipe) {
        throw error("NOT_FOUND", AppErrors.NOT_FOUND, "Recipe not found");
      }
      submitJob(
        Queues.DetectConfiguration,
        { recipeId: recipe.id },
        `detectConfiguration.${recipe.id}`
      );
      return updateRecipe(recipe.id, {
        url: opts.input.update.url,
      });
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

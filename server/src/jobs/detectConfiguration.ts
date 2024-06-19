import {
  DetectConfigurationJob,
  DetectConfigurationProgress,
  Processor,
} from ".";
import {
  findRecipeById,
  maybeSetDefault,
  updateConfiguration,
  updateStatus,
} from "../data/recipes";
import { RecipeConfiguration } from "../data/schema";
import { getBrowser, loadPage } from "../extraction/browser";
import { detectPagination } from "../extraction/detectPagination";

const detectConfiguration: Processor<
  DetectConfigurationJob,
  DetectConfigurationProgress
> = async (job) => {
  const recipe = await findRecipeById(job.data.recipeId);
  if (!recipe) {
    throw new Error(`Recipe with ID ${job.data.recipeId} not found`);
  }

  const configuration = recipe.configuration as RecipeConfiguration;
  job.progress({
    recordId: recipe.id,
    status: "info",
    message: `Detecting catalogue configuration. Page type: ${configuration.rootPageType}`,
  });
  job.progress({
    recordId: recipe.id,
    status: "info",
    message: "Detecting pagination",
  });

  const browser = await getBrowser();
  try {
    const { content, screenshot } = await loadPage(browser, recipe.url, true);

    const pagination = await detectPagination(
      recipe.url,
      content,
      screenshot!,
      configuration.rootPageType
    );

    if (!pagination) {
      job.progress({
        recordId: recipe.id,
        status: "info",
        message: "Could not detect pagination",
      });
    } else {
      job.progress({
        recordId: recipe.id,
        status: "info",
        message: "Configured pagination",
      });
    }

    await updateConfiguration(recipe.id, {
      ...configuration,
      pagination: pagination || undefined,
    });

    job.progress({
      recordId: recipe.id,
      status: "success",
      message: "Finished configuration",
      shouldRefetch: true,
    });

    await updateStatus(recipe.id, "configured");
    await maybeSetDefault(recipe.catalogueId, recipe.id);
  } finally {
    browser.close();
  }
};

export default detectConfiguration;

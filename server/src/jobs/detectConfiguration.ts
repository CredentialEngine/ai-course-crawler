import {
  DetectConfigurationJob,
  DetectConfigurationProgress,
  Processor,
} from ".";
import { findRecipeById, updateConfiguration } from "../data/recipes";
import { getBrowser } from "../extraction/browser";
import recursivelyDetectConfiguration from "../extraction/recursivelyDetectConfiguration";

const detectConfiguration: Processor<
  DetectConfigurationJob,
  DetectConfigurationProgress
> = async (job) => {
  const recipe = await findRecipeById(job.data.recipeId);
  if (!recipe) {
    throw new Error(`Recipe with ID ${job.data.recipeId} not found`);
  }

  const browser = await getBrowser();
  try {
    const configuration = await recursivelyDetectConfiguration(
      browser,
      recipe.url
    );
    await updateConfiguration(recipe.id, configuration);
  } finally {
    browser.close();
  }
};

export default detectConfiguration;

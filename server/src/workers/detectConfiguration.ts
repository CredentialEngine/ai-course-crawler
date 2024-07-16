import {
  DetectConfigurationJob,
  DetectConfigurationProgress,
  Processor,
} from ".";
import { findRecipeById, updateConfiguration } from "../data/recipes";
import recursivelyDetectConfiguration from "../extraction/recursivelyDetectConfiguration";

const detectConfiguration: Processor<
  DetectConfigurationJob,
  DetectConfigurationProgress
> = async (job) => {
  const recipe = await findRecipeById(job.data.recipeId);
  if (!recipe) {
    throw new Error(`Recipe with ID ${job.data.recipeId} not found`);
  }
  const configuration = await recursivelyDetectConfiguration(recipe.url);
  await updateConfiguration(recipe.id, configuration);
};

export default detectConfiguration;

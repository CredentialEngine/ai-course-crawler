import {
  DetectConfigurationJob,
  DetectConfigurationProgress,
  Processor,
} from ".";
import { findRecipeById, updateRecipe } from "../data/recipes";
import { RECIPE_DETECTION_STATUSES } from "../data/schema";
import { closeCluster } from "../extraction/browser";
import recursivelyDetectConfiguration from "../extraction/recursivelyDetectConfiguration";

process.on("SIGTERM", async () => {
  console.log("Shutting down detectConfiguration");
  closeCluster();
});

const detectConfiguration: Processor<
  DetectConfigurationJob,
  DetectConfigurationProgress
> = async (job) => {
  const recipe = await findRecipeById(job.data.recipeId);
  if (!recipe) {
    throw new Error(`Recipe with ID ${job.data.recipeId} not found`);
  }
  await updateRecipe(recipe.id, {
    status: RECIPE_DETECTION_STATUSES.IN_PROGRESS,
  });
  try {
    const configuration = await recursivelyDetectConfiguration(recipe.url);
    await updateRecipe(recipe.id, {
      configuration,
      status: RECIPE_DETECTION_STATUSES.SUCCESS,
    });
  } catch (err: unknown) {
    let detectionFailureReason =
      err instanceof Error ? err.message : "Unknown error";
    await updateRecipe(recipe.id, {
      detectionFailureReason,
      status: RECIPE_DETECTION_STATUSES.ERROR,
    });
    throw err;
  }
};

export default detectConfiguration;

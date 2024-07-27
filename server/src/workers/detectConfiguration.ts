import {
  DetectConfigurationJob,
  DetectConfigurationProgress,
  Processor,
} from ".";
import { findRecipeById, updateRecipe } from "../data/recipes";
import { RecipeDetectionStatus } from "../data/schema";
import { sendEmailToAll } from "../email";
import DetectConfigurationFail from "../emails/detectConfigurationFail";
import DetectConfigurationSuccess from "../emails/detectConfigurationSuccess";
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
    status: RecipeDetectionStatus.IN_PROGRESS,
  });
  try {
    const configuration = await recursivelyDetectConfiguration(recipe.url);
    await updateRecipe(recipe.id, {
      configuration,
      status: RecipeDetectionStatus.SUCCESS,
    });
    sendEmailToAll(DetectConfigurationSuccess, {
      catalogueId: recipe.catalogueId,
      recipeId: recipe.id,
      url: recipe.url,
    });
  } catch (err: unknown) {
    let detectionFailureReason =
      err instanceof Error ? err.message : "Unknown error";
    await updateRecipe(recipe.id, {
      detectionFailureReason,
      status: RecipeDetectionStatus.ERROR,
    });
    if (job.attemptsStarted == job.opts.attempts) {
      sendEmailToAll(DetectConfigurationFail, {
        catalogueId: recipe.catalogueId,
        recipeId: recipe.id,
        url: recipe.url,
        reason: detectionFailureReason,
      });
    }
    throw err;
  }
};

export default detectConfiguration;

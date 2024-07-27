import { deepEqual } from "fast-equals";
import {
  JobWithProgress,
  Processor,
  Queues,
  UpdateExtractionCompletionJob,
  UpdateExtractionCompletionProgress,
} from ".";
import {
  findExtractionById,
  getStepStats,
  updateExtraction,
} from "../data/extractions";
import {
  CompletionStats,
  ExtractionStatus,
  PageStatus,
  StepCompletionStats,
} from "../data/schema";
import { sendEmailToAll } from "../email";
import ExtractionComplete from "../emails/extractionComplete";
import { closeCluster } from "../extraction/browser";

process.on("SIGTERM", async () => {
  console.log("Shutting down updateExtractionCompletion");
  await closeCluster();
});

function hoursDiff(date1: Date, date2: Date): number {
  const millisecondsInHour = 60 * 60 * 1000; // 1 hour in milliseconds
  const differenceInMilliseconds = Math.abs(date2.getTime() - date1.getTime());
  return differenceInMilliseconds / millisecondsInHour;
}

async function getStepCompletionStats(
  extraction: NonNullable<Awaited<ReturnType<typeof findExtractionById>>>
) {
  const stats: StepCompletionStats[] = [];
  for (const step of extraction.crawlSteps || []) {
    const rawStepStats = await getStepStats(step.id);
    let downloadsTotal = 0,
      downloadsAttempted = 0,
      downloadsSucceeded = 0,
      extractionsAttempted = 0,
      extractionsSucceeded = 0,
      extractionsCourses = 0;
    for (const rawPageStats of rawStepStats) {
      downloadsTotal += 1;
      if (rawPageStats.status == PageStatus.SUCCESS) {
        downloadsAttempted += 1;
        downloadsSucceeded += 1;
      } else if (rawPageStats.status == PageStatus.ERROR) {
        downloadsAttempted += 1;
      }
      if (rawPageStats.dataExtractionStartedAt) {
        extractionsAttempted += 1;
        if (rawPageStats.dataItemCount > 0) {
          extractionsSucceeded += 1;
          extractionsCourses += rawPageStats.dataItemCount;
        }
      }
    }
    stats.push({
      downloads: {
        total: downloadsTotal,
        attempted: downloadsAttempted,
        succeeded: downloadsSucceeded,
      },
      extractions: {
        attempted: extractionsAttempted,
        succeeded: extractionsSucceeded,
        courses: extractionsCourses,
      },
    });
  }
  return stats;
}

async function removeSelf(
  job: JobWithProgress<
    UpdateExtractionCompletionJob,
    UpdateExtractionCompletionProgress
  >
) {
  console.log(`Removing repeatable job ${job.repeatJobKey}`);
  return Queues.UpdateExtractionCompletion.removeRepeatableByKey(
    job.repeatJobKey!
  );
}

async function afterExtractionComplete(
  job: JobWithProgress<
    UpdateExtractionCompletionJob,
    UpdateExtractionCompletionProgress
  >,
  extraction: NonNullable<Awaited<ReturnType<typeof findExtractionById>>>,
  completionStats: CompletionStats,
  stale = false
) {
  await removeSelf(job);
  return sendEmailToAll(ExtractionComplete, {
    extractionId: extraction.id,
    recipeId: extraction.recipeId,
    catalogueId: extraction.recipe.catalogueId,
    catalogueName: extraction.recipe.catalogue.name,
    url: extraction.recipe.url,
    completionStats,
    createdAt: extraction.createdAt,
    stale,
  });
}

const updateExtractionCompletion: Processor<
  UpdateExtractionCompletionJob,
  UpdateExtractionCompletionProgress
> = async (job) => {
  const extraction = await findExtractionById(job.data.extractionId);
  if (!extraction || extraction.status == ExtractionStatus.COMPLETE) {
    await removeSelf(job);
    return;
  }
  console.log(`Updating completion for extraction ${extraction.id}`);

  const stepStats = await getStepCompletionStats(extraction);
  const currentDate = new Date();

  // If there's a preexisting completionStats value, check if it changed
  if (extraction.completionStats) {
    const hasChanges = !deepEqual(stepStats, extraction.completionStats.steps);
    const lastChangeHrs = hoursDiff(
      new Date(extraction.completionStats.generatedAt),
      currentDate
    );
    if (!hasChanges) {
      if (lastChangeHrs < 2) {
        console.log(`No changes for extraction ${extraction.id}; waiting`);
        // No changes but it has been under 2hrs. Wait a while.
        return;
      }
      // Extraction looks stale...
      console.log(
        `No changes for extraction ${extraction.id}; marking as stale`
      );
      const completionStats: CompletionStats = {
        generatedAt: new Date().toISOString(),
        steps: stepStats,
      };
      await updateExtraction(extraction.id, {
        completionStats,
        status: ExtractionStatus.STALE,
      });
      return afterExtractionComplete(job, extraction, completionStats, true);
    }
  }

  console.log(`Detected changes for extraction ${extraction.id}`);
  const completionStats: CompletionStats = {
    generatedAt: new Date().toISOString(),
    steps: stepStats,
  };
  const allStepsCompleted = stepStats.every(
    (s) =>
      s.downloads.attempted == s.downloads.total &&
      s.extractions.attempted == s.downloads.succeeded
  );
  const status = allStepsCompleted ? ExtractionStatus.COMPLETE : undefined;
  await updateExtraction(extraction.id, { completionStats, status });
  if (status == ExtractionStatus.COMPLETE) {
    console.log(
      `All steps for ${extraction.id} are done, marking as completed`
    );
    return afterExtractionComplete(job, extraction, completionStats);
  }
};

export default updateExtractionCompletion;

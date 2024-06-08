import {
  BaseExtractionJob,
  ExtractCourseCatalogueProgress,
  ExtractionStepJob,
  JobWithProgress,
} from ".";
import { createExtractionLog, findExtractionById } from "../data/extractions";
import { EXTRACTION_LOG_LEVELS, PaginationConfiguration } from "../data/schema";

const assertExtraction = async <T extends BaseExtractionJob>(
  job: JobWithProgress<T, unknown>
) => {
  const extraction = await findExtractionById(job.data.extractionId);
  if (!extraction) {
    const message = `Extraction not found`;
    await logAndNotify(job, message, EXTRACTION_LOG_LEVELS.ERROR);
    throw new Error(message);
  }
  return extraction;
};

const assertStep = async (
  job: JobWithProgress<ExtractionStepJob, ExtractCourseCatalogueProgress>
) => {
  const extraction = await findExtractionById(job.data.extractionId);
  if (!extraction) {
    const message = `Extraction not found`;
    await logAndNotify(job, message, EXTRACTION_LOG_LEVELS.ERROR);
    throw new Error(message);
  }
  const step = extraction.extractionSteps.find((s) => s.id == job.data.stepId);
  if (!step) {
    const message = `Step not found`;
    await logAndNotify(job, message, EXTRACTION_LOG_LEVELS.ERROR);
    throw new Error(message);
  }
  const parentStep = step.parentStepId
    ? extraction.extractionSteps.find((s) => s.id == step.parentStepId)
    : undefined;

  return { extraction, step, parentStep };
};

const logAndNotify = async <T extends BaseExtractionJob>(
  job: JobWithProgress<T, ExtractCourseCatalogueProgress>,
  log: string,
  logLevel: EXTRACTION_LOG_LEVELS = EXTRACTION_LOG_LEVELS.INFO
) => {
  console.log(
    `Logging extraction ID ${job.data.extractionId} ${log} ${logLevel}`
  );
  await createExtractionLog(job.data.extractionId, log, logLevel);
  job.progress({
    recordId: job.data.extractionId,
    message: log,
  });
};

const constructPaginatedUrls = (configuration: PaginationConfiguration) => {
  const urls = [];
  if (configuration.urlPatternType == "offset") {
    // TODO: implement offset logic
    return [];
  } else if (configuration.urlPatternType == "page_num") {
    for (let i = 1; i <= configuration.totalPages; i++) {
      urls.push(configuration.urlPattern.replace("{page_num}", i.toString()));
    }
    return urls;
  } else {
    throw new Error("Unknown pagination pattern type");
  }
};

export { assertExtraction, assertStep, constructPaginatedUrls, logAndNotify };

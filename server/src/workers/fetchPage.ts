import {
  FetchPageJob,
  FetchPageProgress,
  Processor,
  Queues,
  submitJob,
} from ".";
import {
  createStep,
  createStepItem,
  findStepItemForJob,
  updateStepItem,
  updateStepItemStatus,
} from "../data/extractions";
import {
  PAGE_DATA_TYPE,
  RecipeConfiguration,
  STEP_ITEM_STATUSES,
  STEPS,
} from "../data/schema";
import { getBrowser, loadPage } from "../extraction/browser";
import { detectPageCount } from "../extraction/detectPageCount";
import { createUrlExtractor } from "../extraction/detectUrlRegexp";
import { constructPaginatedUrls } from "./utils";

export interface NextStep {
  step: STEPS;
}

async function enqueueExtraction(
  stepItem: Awaited<ReturnType<typeof findStepItemForJob>>
) {
  console.log(`Enqueuing extraction for step item ${stepItem.id}`);
  return submitJob(Queues.ExtractData, { stepItemId: stepItem.id });
}

async function enqueuePages(
  configuration: RecipeConfiguration,
  stepItem: Awaited<ReturnType<typeof findStepItemForJob>>
) {
  console.log(`Enqueuing page fetches for step item ${stepItem.id}`);

  const pageCount = await detectPageCount(
    stepItem.content!,
    configuration.pagination!.urlPattern,
    configuration.pagination!.urlPatternType,
    stepItem.screenshot!
  );

  if (!pageCount) {
    throw new Error("Couldn't determine page count for paginated page");
  }

  const updatedPagination = {
    ...configuration.pagination!,
    totalPages: pageCount.totalPages,
  };

  const pageUrls = constructPaginatedUrls(updatedPagination);

  const fetchPagesStep = await createStep({
    extractionId: stepItem.extractionStep.extractionId,
    step: STEPS.FETCH_PAGINATED,
    parentStepId: stepItem.extractionStepId,
    configuration,
  });

  for (const url of pageUrls) {
    const fetchPageItem = await createStepItem({
      extractionStepId: fetchPagesStep.id,
      url,
      dataType: configuration.pageType,
    });
    await submitJob(Queues.FetchPage, { stepItemId: fetchPageItem.id });
  }
}

async function processLinks(
  configuration: RecipeConfiguration,
  stepItem: Awaited<ReturnType<typeof findStepItemForJob>>
) {
  console.log(`Processing links for step item ${stepItem.id}`);

  const regexp = new RegExp(configuration.linkRegexp!, "g");
  const extractor = createUrlExtractor(regexp);
  const urls = await extractor(stepItem.url, stepItem.content!);

  const fetchLinksStep = await createStep({
    extractionId: stepItem.extractionStep.extractionId,
    step: STEPS.FETCH_LINKS,
    parentStepId: stepItem.extractionStepId,
    configuration: configuration.links!,
  });

  for (const url of urls) {
    const fetchLinkItem = await createStepItem({
      extractionStepId: fetchLinksStep.id,
      url,
      dataType: configuration.links!.pageType,
    });
    await submitJob(Queues.FetchPage, { stepItemId: fetchLinkItem.id });
  }
}

const processNextStep = async (
  stepItem: Awaited<ReturnType<typeof findStepItemForJob>>
) => {
  const configuration = stepItem.extractionStep
    .configuration as RecipeConfiguration;
  const currentStep = stepItem.extractionStep.step;

  if (configuration.pagination && currentStep != STEPS.FETCH_PAGINATED) {
    return enqueuePages(configuration, stepItem);
  }

  if (configuration.pageType == PAGE_DATA_TYPE.COURSE_DETAIL_PAGE) {
    return enqueueExtraction(stepItem);
  }

  if (!configuration.links) {
    throw new Error(
      "Don't know what to do - no links and no matching page type"
    );
  }

  processLinks(configuration, stepItem);
};

const fetchPage: Processor<FetchPageJob, FetchPageProgress> = async (job) => {
  const stepItem = await findStepItemForJob(job.data.stepItemId);

  const browser = await getBrowser();
  try {
    console.log(`Loading ${stepItem.url} for step item ${stepItem.id}`);
    await updateStepItemStatus(stepItem.id, STEP_ITEM_STATUSES.IN_PROGRESS);
    const page = await loadPage(browser, stepItem.url);
    await updateStepItem(
      stepItem.id,
      STEP_ITEM_STATUSES.SUCCESS,
      page.content,
      page.screenshot
    );
    stepItem.content = page.content;
    stepItem.screenshot = page.screenshot || null;
    await processNextStep(stepItem);
  } catch (err) {
    await updateStepItemStatus(stepItem.id, STEP_ITEM_STATUSES.ERROR);
  } finally {
    await browser.close();
  }
};

export default fetchPage;

import {
  FetchPageJob,
  FetchPageProgress,
  Processor,
  Queues,
  submitJob,
} from ".";
import {
  createPage,
  createStep,
  findPageForJob,
  updatePage,
  updatePageStatus,
} from "../data/extractions";
import {
  PAGE_DATA_TYPE,
  PaginationConfiguration,
  RecipeConfiguration,
  STEP_ITEM_STATUSES,
  STEPS,
} from "../data/schema";
import { closeCluster, fetchBrowserPage } from "../extraction/browser";
import { detectPageCount } from "../extraction/detectPageCount";
import { createUrlExtractor } from "../extraction/detectUrlRegexp";

process.on("SIGTERM", async () => {
  console.log("Shutting down fetchPage");
  await closeCluster();
});

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

async function enqueueExtraction(
  crawlPage: Awaited<ReturnType<typeof findPageForJob>>
) {
  console.log(`Enqueuing extraction for page ${crawlPage.id}`);
  return submitJob(Queues.ExtractData, { crawlPageId: crawlPage.id });
}

async function enqueuePages(
  configuration: RecipeConfiguration,
  crawlPage: Awaited<ReturnType<typeof findPageForJob>>
) {
  console.log(`Enqueuing page fetches for page ${crawlPage.id}`);

  const pageCount = await detectPageCount(
    crawlPage.content!,
    configuration.pagination!.urlPattern,
    configuration.pagination!.urlPatternType,
    crawlPage.screenshot!
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
    extractionId: crawlPage.crawlStep.extractionId,
    step: STEPS.FETCH_PAGINATED,
    parentStepId: crawlPage.crawlStepId,
    configuration,
  });

  for (const url of pageUrls) {
    const fetchPageItem = await createPage({
      crawlStepId: fetchPagesStep.id,
      url,
      dataType: configuration.pageType,
    });
    await submitJob(Queues.FetchPage, { crawlPageId: fetchPageItem.id });
  }
}

async function processLinks(
  configuration: RecipeConfiguration,
  crawlPage: Awaited<ReturnType<typeof findPageForJob>>
) {
  console.log(`Processing links for page ${crawlPage.id}`);

  const regexp = new RegExp(configuration.linkRegexp!, "g");
  const extractor = createUrlExtractor(regexp);
  const urls = await extractor(crawlPage.url, crawlPage.content!);

  const fetchLinksStep = await createStep({
    extractionId: crawlPage.crawlStep.extractionId,
    step: STEPS.FETCH_LINKS,
    parentStepId: crawlPage.crawlStepId,
    configuration: configuration.links!,
  });

  for (const url of urls) {
    const fetchLinkItem = await createPage({
      crawlStepId: fetchLinksStep.id,
      url,
      dataType: configuration.links!.pageType,
    });
    await submitJob(Queues.FetchPage, { crawlPageId: fetchLinkItem.id });
  }
}

const processNextStep = async (
  crawlPage: Awaited<ReturnType<typeof findPageForJob>>
) => {
  const configuration = crawlPage.crawlStep
    .configuration as RecipeConfiguration;
  const currentStep = crawlPage.crawlStep.step;

  if (configuration.pagination && currentStep != STEPS.FETCH_PAGINATED) {
    return enqueuePages(configuration, crawlPage);
  }

  if (configuration.pageType == PAGE_DATA_TYPE.COURSE_DETAIL_PAGE) {
    return enqueueExtraction(crawlPage);
  }

  if (!configuration.links) {
    throw new Error(
      "Don't know what to do - no links and no matching page type"
    );
  }

  processLinks(configuration, crawlPage);
};

const fetchPage: Processor<FetchPageJob, FetchPageProgress> = async (job) => {
  const crawlPage = await findPageForJob(job.data.crawlPageId);

  try {
    console.log(`Loading ${crawlPage.url} for page ${crawlPage.id}`);
    await updatePageStatus(crawlPage.id, STEP_ITEM_STATUSES.IN_PROGRESS);
    const page = await fetchBrowserPage(crawlPage.url);
    await updatePage(
      crawlPage.id,
      STEP_ITEM_STATUSES.SUCCESS,
      page.content,
      page.screenshot
    );
    crawlPage.content = page.content;
    crawlPage.screenshot = page.screenshot || null;
    await processNextStep(crawlPage);
  } catch (err) {
    await updatePageStatus(crawlPage.id, STEP_ITEM_STATUSES.ERROR);
    throw err;
  }
};

export default fetchPage;

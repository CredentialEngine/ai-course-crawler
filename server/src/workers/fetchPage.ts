import {
  FetchPageJob,
  FetchPageProgress,
  Processor,
  Queues,
  submitJob,
  submitJobs,
} from ".";
import {
  createStepAndPages,
  findPageForJob,
  updateExtraction,
  updatePage,
} from "../data/extractions";
import {
  ExtractionStatus,
  PageStatus,
  PageType,
  PaginationConfiguration,
  RecipeConfiguration,
  Step,
} from "../data/schema";
import { closeCluster, fetchBrowserPage } from "../extraction/browser";
import { detectPageCount } from "../extraction/llm/detectPageCount";
import { createUrlExtractor } from "../extraction/llm/detectUrlRegexp";

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
  return submitJob(
    Queues.ExtractData,
    { crawlPageId: crawlPage.id },
    `extractData.${crawlPage.id}`
  );
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
    {
      screenshot: crawlPage.screenshot!,
      logApiCalls: { extractionId: crawlPage.crawlStep.extractionId },
    }
  );

  if (!pageCount) {
    throw new Error("Couldn't determine page count for paginated page");
  }

  const updatedPagination = {
    ...configuration.pagination!,
    totalPages: pageCount.totalPages,
  };

  const pageUrls = constructPaginatedUrls(updatedPagination);

  const stepAndPages = await createStepAndPages({
    extractionId: crawlPage.crawlStep.extractionId,
    step: Step.FETCH_PAGINATED,
    parentStepId: crawlPage.crawlStepId,
    configuration,
    pageType: configuration.pageType,
    pages: pageUrls.map((url) => ({ url })),
  });

  // Non course detail pages get the highest priority
  const priority =
    configuration.pageType == PageType.COURSE_DETAIL_PAGE ? undefined : 1;

  await submitJobs(
    Queues.FetchPage,
    stepAndPages.pages.map((page) => ({
      data: { crawlPageId: page.id },
      jobId: `fetchPage.${page.id}`,
      priority,
    }))
  );
}

async function processLinks(
  configuration: RecipeConfiguration,
  crawlPage: Awaited<ReturnType<typeof findPageForJob>>
) {
  console.log(`Processing links for page ${crawlPage.id}`);

  const regexp = new RegExp(configuration.linkRegexp!, "g");
  const extractor = createUrlExtractor(regexp);
  const urls = await extractor(crawlPage.url, crawlPage.content!);

  const stepAndPages = await createStepAndPages({
    extractionId: crawlPage.crawlStep.extractionId,
    step: Step.FETCH_LINKS,
    parentStepId: crawlPage.crawlStepId,
    configuration: configuration.links!,
    pageType: configuration.links!.pageType,
    pages: urls.map((url) => ({ url })),
  });

  // Non course detail pages get the highest priority
  const priority =
    configuration.links!.pageType == PageType.COURSE_DETAIL_PAGE
      ? undefined
      : 1;

  await submitJobs(
    Queues.FetchPage,
    stepAndPages.pages.map((page) => ({
      data: { crawlPageId: page.id },
      jobId: `fetchPage.${page.id}`,
      priority,
    }))
  );
}

const processNextStep = async (
  crawlPage: Awaited<ReturnType<typeof findPageForJob>>
) => {
  const configuration = crawlPage.crawlStep
    .configuration as RecipeConfiguration;
  const currentStep = crawlPage.crawlStep.step;

  if (configuration.pagination && currentStep != Step.FETCH_PAGINATED) {
    return enqueuePages(configuration, crawlPage);
  }

  if (configuration.pageType == PageType.COURSE_DETAIL_PAGE) {
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

  if (crawlPage.crawlStep.extraction.status == ExtractionStatus.CANCELLED) {
    console.log(
      `Extraction ${crawlPage.crawlStep.extractionId} was cancelled; aborting`
    );
    return;
  }

  if (crawlPage.crawlStep.step == Step.FETCH_ROOT) {
    await updateExtraction(crawlPage.crawlStep.extractionId, {
      status: ExtractionStatus.IN_PROGRESS,
    });
  }

  try {
    console.log(`Loading ${crawlPage.url} for page ${crawlPage.id}`);
    await updatePage(crawlPage.id, { status: PageStatus.IN_PROGRESS });
    const page = await fetchBrowserPage(crawlPage.url);
    if (!page.content) {
      throw new Error(`Could not fetch URL ${crawlPage.url}`);
    }
    crawlPage.content = page.content;
    crawlPage.screenshot = page.screenshot || null;
    await updatePage(crawlPage.id, {
      content: page.content,
      screenshot: page.screenshot,
    });
    await processNextStep(crawlPage);
    await updatePage(crawlPage.id, {
      status: PageStatus.SUCCESS,
    });
  } catch (err) {
    await updatePage(crawlPage.id, { status: PageStatus.ERROR });
    throw err;
  }
};

export default fetchPage;

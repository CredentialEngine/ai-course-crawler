import { Browser } from "puppeteer";
import {
  ExtractCourseCatalogueProgress,
  ExtractionStepJob,
  Processor,
  Queues,
  submitJob,
} from ".";
import { createStep, createStepItem } from "../data/extractions";
import {
  FetchCategoryLinksStepConfiguration,
  FetchPaginatedUrlsStepConfiguration,
  PAGE_DATA_TYPE,
  STEPS,
  STEP_ITEM_STATUSES,
} from "../data/schema";
import {
  LoadAllConfiguration,
  getBrowser,
  loadAll,
  loadPage,
} from "../extraction/browser";
import extractDetailUrls from "../extraction/extractDetailUrls";
import { exponentialRetry } from "../utils";
import {
  assertStep,
  constructPaginatedUrls,
  logAndNotify,
} from "./extractionUtils";

const findRegexp = async (
  browser: Browser,
  dataType: PAGE_DATA_TYPE,
  url: string
) => {
  const page = await loadPage(browser, url, true);
  const detailUrlRegexp = await extractDetailUrls(
    url,
    page.content,
    page.screenshot!,
    dataType
  );

  if (!detailUrlRegexp) {
    throw new Error(`Couldn't find detail regexp for ${url}.`);
  }

  const pageUrls = await detailUrlRegexp.extract(url, page.content);

  if (!pageUrls?.length) {
    throw new Error(
      `Regexp for ${url} did not work: ${detailUrlRegexp.regexp}`
    );
  }

  return detailUrlRegexp;
};

const fetchPaginatedUrls: Processor<
  ExtractionStepJob,
  ExtractCourseCatalogueProgress
> = async (job) => {
  const { extraction, step } = await assertStep(job);
  await logAndNotify(job, `Fetching paginated URLs for ${step.id}`);
  const configuration =
    step.configuration! as FetchPaginatedUrlsStepConfiguration;
  const urls = constructPaginatedUrls(configuration.pagination);
  const browser = await getBrowser();

  try {
    const regexp = await exponentialRetry(
      () => findRegexp(browser, configuration.dataType, urls[0]),
      10
    );
    const batchLoadConfig: LoadAllConfiguration = {
      beforeLoad: (url) => logAndNotify(job, `Fetching ${url}`),
      onLoad: (url, content) =>
        logAndNotify(job, `Successfully fetched ${url}`),
      batchSize: 5,
    };
    const pages = await loadAll(browser, urls, batchLoadConfig);

    for (const { url, content, screenshot } of pages) {
      let detailUrls;
      if (
        configuration.dataType == PAGE_DATA_TYPE.CATEGORY_PAGE ||
        configuration.dataType == PAGE_DATA_TYPE.COURSE_LINKS_PAGE
      ) {
        await logAndNotify(job, `Extracting detail URLs for ${url}`);
        detailUrls = await regexp.extract(url, content);
      }

      await createStepItem(
        step.id,
        url,
        content,
        configuration.dataType,
        STEP_ITEM_STATUSES.SUCCESS,
        screenshot,
        undefined,
        { detailUrls }
      );
    }

    if (configuration.dataType == PAGE_DATA_TYPE.CATEGORY_PAGE) {
      await logAndNotify(job, `Submitting category links job for ${step.id}`);
      const newStepConfiguration: FetchCategoryLinksStepConfiguration = {
        level: configuration.categoryLevel
          ? configuration.categoryLevel + 1
          : 1,
      };
      const nextStep = await createStep(
        extraction.id,
        STEPS.FETCH_COURSE_CATEGORY_LINKS,
        step.id,
        newStepConfiguration
      );
      await submitJob(Queues.FetchCategoryLinks, {
        stepId: nextStep.id,
        extractionId: extraction.id,
      });
    } else if (configuration.dataType == PAGE_DATA_TYPE.COURSE_LINKS_PAGE) {
      await logAndNotify(job, `Submitting course links job for ${step.id}`);
      const nextStep = await createStep(
        extraction.id,
        STEPS.FETCH_COURSE_LINKS,
        step.id
      );
      await submitJob(Queues.FetchCourseLinks, {
        stepId: nextStep.id,
        extractionId: extraction.id,
      });
    }
  } finally {
    browser.close();
  }
};

export default fetchPaginatedUrls;

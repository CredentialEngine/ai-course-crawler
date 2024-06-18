import {
  ExtractCourseCatalogueProgress,
  ExtractionStepJob,
  Processor,
  Queues,
  submitJob,
} from ".";
import { createStepItem, findStepItems } from "../data/extractions";
import {
  EXTRACTION_LOG_LEVELS,
  NavigationData,
  PAGE_DATA_TYPE,
  STEP_ITEM_STATUSES,
} from "../data/schema";
import {
  LoadAllConfiguration,
  getBrowser,
  loadAll,
} from "../extraction/browser";
import { assertStep, logAndNotify } from "./extractionUtils";

const fetchCourseLinks: Processor<
  ExtractionStepJob,
  ExtractCourseCatalogueProgress
> = async (job) => {
  const { step, parentStep } = await assertStep(job);
  await logAndNotify(job, `Fetching course links for step ${parentStep!.id}`);
  const parentStepItems = await findStepItems(parentStep!.id);
  const browser = await getBrowser();
  try {
    for (const stepItem of parentStepItems) {
      if (!stepItem.navigationData) {
        await logAndNotify(
          job,
          "Error - can't find navigation data",
          EXTRACTION_LOG_LEVELS.ERROR
        );
        continue;
      }
      const navigationData = stepItem.navigationData as NavigationData;
      if (!navigationData.detailUrls) {
        await logAndNotify(
          job,
          "Error - can't find detail URLs",
          EXTRACTION_LOG_LEVELS.ERROR
        );
        continue;
      }
      await logAndNotify(
        job,
        `Fetching detail URLs for ${parentStep!.id} (item ${stepItem.id})`
      );
      const batchLoadConfig: LoadAllConfiguration = {
        beforeLoad: (url) => logAndNotify(job, `Fetching ${url}`),
        onLoad: (url, content) =>
          logAndNotify(job, `Successfully fetched ${url}`),
        batchSize: 2,
      };
      const detailPages = await loadAll(
        browser,
        navigationData.detailUrls,
        batchLoadConfig
      );

      for (const { url, content, screenshot } of detailPages) {
        await logAndNotify(job, `Course page ${url} - ready for parsing`);
        const item = await createStepItem(
          step.id,
          url,
          content,
          PAGE_DATA_TYPE.COURSE_DETAIL_PAGE,
          STEP_ITEM_STATUSES.SUCCESS,
          screenshot
        );
        await submitJob(Queues.ExtractDataItem, {
          extractionId: step.extractionId,
          stepItemId: item.id,
        });
      }
    }
  } finally {
    browser.close();
  }
};

export default fetchCourseLinks;

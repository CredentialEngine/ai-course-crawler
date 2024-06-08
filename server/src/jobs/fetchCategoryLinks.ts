import {
  ExtractCourseCatalogueProgress,
  ExtractionStepJob,
  Processor,
  Queues,
  submitJob,
} from ".";
import { createStep, createStepItem, findStepItems } from "../data/extractions";
import {
  EXTRACTION_LOG_LEVELS,
  FetchCategoryLinksStepConfiguration,
  FetchPaginatedUrlsStepConfiguration,
  NavigationData,
  PAGE_DATA_TYPE,
  STEPS,
  STEP_ITEM_STATUSES,
} from "../data/schema";
import {
  LoadAllConfiguration,
  getBrowser,
  loadAll,
} from "../extraction/browser";
import { detectCategoryPageType } from "../extraction/detectCategoryPageType";
import { detectPagination } from "../extraction/detectPagination";
import { assertStep, logAndNotify } from "./extractionUtils";

const fetchCategoryLinks: Processor<
  ExtractionStepJob,
  ExtractCourseCatalogueProgress
> = async (job) => {
  await logAndNotify(job, "Fetching category links");
  const { step, parentStep } = await assertStep(job);
  const configuration =
    step.configuration! as FetchCategoryLinksStepConfiguration;
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
          "Error - can't find navigation URLs",
          EXTRACTION_LOG_LEVELS.ERROR
        );
        continue;
      }
      await logAndNotify(
        job,
        `Fetching detail URLs for step ${parentStep!.id}`
      );
      const batchLoadConfig: LoadAllConfiguration = {
        beforeLoad: (url) => logAndNotify(job, `Fetching ${url}`),
        onLoad: (url, content) =>
          logAndNotify(job, `Successfully fetched ${url}`),
        batchSize: 5,
      };
      const categories = await loadAll(
        browser,
        navigationData.detailUrls,
        batchLoadConfig
      );
      for (const { url, content, screenshot } of categories) {
        await logAndNotify(job, `Detecting data type for URL ${url}`);
        const dataType = await detectCategoryPageType(url, content, screenshot);
        if (!dataType) {
          await logAndNotify(
            job,
            "Error - can't detect data type",
            EXTRACTION_LOG_LEVELS.ERROR
          );
          continue;
        }
        await createStepItem(
          step.id,
          url,
          content,
          dataType,
          STEP_ITEM_STATUSES.SUCCESS,
          screenshot
        );

        await logAndNotify(job, `Detecting pagination for URL ${url}`);
        const pagination = await detectPagination(
          url,
          content,
          screenshot,
          dataType
        );
        if (pagination) {
          await logAndNotify(
            job,
            `Found pagination for URL ${url} - creating pagination job`
          );
          await createStep(
            step.extractionId,
            STEPS.FETCH_PAGINATED_URLS,
            step.id,
            {
              dataType,
              pagination,
              categoryLevel: configuration.level,
            } as FetchPaginatedUrlsStepConfiguration
          );
          await submitJob(Queues.FetchPaginatedUrls, {
            extractionId: step.extractionId,
            stepId: step.id,
          });
        } else {
          await logAndNotify(job, `Did not find pagination for URL ${url}`);
          if (dataType == PAGE_DATA_TYPE.CATEGORY_PAGE) {
            await logAndNotify(
              job,
              `Submitting category links job for URL ${url}`
            );
            const newStepConfiguration: FetchCategoryLinksStepConfiguration = {
              level: configuration.level ? configuration.level + 1 : 1,
            };
            const nextStep = await createStep(
              step.extractionId,
              STEPS.FETCH_COURSE_CATEGORY_LINKS,
              step.id,
              newStepConfiguration
            );
            await submitJob(Queues.FetchCategoryLinks, {
              stepId: nextStep.id,
              extractionId: step.extractionId,
            });
          } else if (dataType == PAGE_DATA_TYPE.COURSE_LINKS_PAGE) {
            await logAndNotify(
              job,
              `Submitting course links job for URL ${url}`
            );
            const nextStep = await createStep(
              step.extractionId,
              STEPS.FETCH_COURSE_LINKS,
              step.id
            );
            await submitJob(Queues.FetchCourseLinks, {
              stepId: nextStep.id,
              extractionId: step.extractionId,
            });
          }
        }
      }
    }
  } finally {
    browser.close();
  }
};

export default fetchCategoryLinks;

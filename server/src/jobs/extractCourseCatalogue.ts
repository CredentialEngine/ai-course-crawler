import {
  BaseExtractionJob,
  ExtractCourseCatalogueProgress,
  Processor,
  Queues,
  submitJob,
} from ".";
import { createStep, createStepItem } from "../data/extractions";
import {
  FetchPaginatedUrlsStepConfiguration,
  PAGE_DATA_TYPE,
  RecipeConfiguration,
  STEPS,
} from "../data/schema";
import { getBrowser, loadPage } from "../extraction/browser";
import extractDetailUrls from "../extraction/extractDetailUrls";
import { assertExtraction, logAndNotify } from "./extractionUtils";

const extractCourseCatalogue: Processor<
  BaseExtractionJob,
  ExtractCourseCatalogueProgress
> = async (job) => {
  await logAndNotify(job, "Starting extraction");
  const extraction = await assertExtraction(job);
  const recipeConfiguration = extraction.recipe
    .configuration as RecipeConfiguration;
  if (recipeConfiguration.pagination) {
    await logAndNotify(job, "Has pagination - creating pagination job");
    const step = await createStep(
      extraction.id,
      STEPS.FETCH_PAGINATED_URLS,
      undefined,
      {
        dataType: recipeConfiguration.rootPageType,
        pagination: recipeConfiguration.pagination,
        categoryLevel:
          recipeConfiguration.rootPageType == PAGE_DATA_TYPE.CATEGORY_PAGE
            ? 1
            : undefined,
      } as FetchPaginatedUrlsStepConfiguration
    );
    await submitJob(Queues.FetchPaginatedUrls, {
      extractionId: extraction.id,
      stepId: step.id,
    });
    await logAndNotify(job, "Has pagination - created pagination job");
  } else {
    await logAndNotify(job, "Single page job");
    const step = await createStep(extraction.id, STEPS.FETCH_SINGLE_URL);
    const browser = await getBrowser();
    try {
      await logAndNotify(job, `Fetching URL (${extraction.recipe.url})`);
      const { content, screenshot } = await loadPage(
        browser,
        extraction.recipe.url,
        true
      );
      const dataType = recipeConfiguration.rootPageType;
      if (dataType == PAGE_DATA_TYPE.COURSE_DETAIL_PAGE) {
        await createStepItem(
          step.id,
          extraction.recipe.url,
          content,
          dataType,
          undefined,
          screenshot
        );
        await logAndNotify(job, "Course page - ready for parsing");
      } else {
        await logAndNotify(
          job,
          `Extracting detail URLs (${extraction.recipe.url})`
        );
        const detailUrls = await extractDetailUrls(
          extraction.recipe.url,
          content,
          screenshot!,
          dataType
        );
        await createStepItem(
          step.id,
          extraction.recipe.url,
          content,
          dataType,
          undefined,
          screenshot,
          undefined,
          {
            detailUrls,
          }
        );
        const queue = {
          [PAGE_DATA_TYPE.COURSE_LINKS_PAGE]: Queues.FetchCourseLinks,
          [PAGE_DATA_TYPE.CATEGORY_PAGE]: Queues.FetchCategoryLinks,
        }[dataType];
        await logAndNotify(job, `Submitting extraction job for ${dataType}`);
        await submitJob(queue, {
          extractionId: extraction.id,
          stepId: step.id,
        });
      }
    } finally {
      browser.close();
    }
  }
};

export default extractCourseCatalogue;

import { ExtractDataJob, ExtractDataProgress, Processor } from ".";
import { createDataItem, findOrCreateDataset } from "../data/datasets";
import { findPageForJob, updatePage } from "../data/extractions";
import {
  ExtractionStatus,
  getSqliteTimestamp,
  readMarkdownContent,
  readScreenshot,
} from "../data/schema";
import { closeCluster } from "../extraction/browser";
import { extractCourseDataItem } from "../extraction/llm/extractCourseDataItem";

process.on("SIGTERM", async () => {
  console.log("Shutting down extractData");
  await closeCluster();
});

const extractData: Processor<ExtractDataJob, ExtractDataProgress> = async (
  job
) => {
  const crawlPage = await findPageForJob(job.data.crawlPageId);

  if (crawlPage.crawlStep.extraction.status == ExtractionStatus.CANCELLED) {
    console.log(
      `Extraction ${crawlPage.crawlStep.extractionId} was cancelled; aborting`
    );
    return;
  }

  await updatePage(crawlPage.id, {
    dataExtractionStartedAt: getSqliteTimestamp(),
  });
  try {
    const dataset = await findOrCreateDataset(
      crawlPage.crawlStep.extraction.recipe.catalogueId,
      crawlPage.crawlStep.extractionId
    );

    if (!dataset) throw new Error("Could not find or create dataset");

    const content = await readMarkdownContent(
      crawlPage.crawlStep.extractionId,
      crawlPage.crawlStepId,
      crawlPage.id
    );
    const screenshot = await readScreenshot(
      crawlPage.crawlStep.extractionId,
      crawlPage.crawlStepId,
      crawlPage.id
    );
    const coursesData = await extractCourseDataItem({
      url: crawlPage.url,
      content,
      screenshot,
      logApiCalls: { extractionId: crawlPage.crawlStep.extractionId },
    });
    if (!coursesData) {
      throw new Error("Couldn't find course data");
    }
    for (const course of coursesData) {
      await createDataItem(crawlPage.id, dataset.id, course);
    }
  } catch (err) {
    console.log(err);
    throw err;
  }
};

export default extractData;

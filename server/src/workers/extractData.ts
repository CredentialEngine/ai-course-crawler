import { createProcessor, ExtractDataJob, ExtractDataProgress } from ".";
import { createDataItem, findOrCreateDataset } from "../data/datasets";
import { findPageForJob, updatePage } from "../data/extractions";
import {
  ExtractionStatus,
  getSqliteTimestamp,
  readMarkdownContent,
  readScreenshot,
} from "../data/schema";
import { extractCourseDataItem } from "../extraction/llm/extractCourseDataItem";

export default createProcessor<ExtractDataJob, ExtractDataProgress>(
  async function extractData(job) {
    const crawlPage = await findPageForJob(job.data.crawlPageId);

    if (crawlPage.extraction.status == ExtractionStatus.CANCELLED) {
      console.log(
        `Extraction ${crawlPage.extractionId} was cancelled; aborting`
      );
      return;
    }

    await updatePage(crawlPage.id, {
      dataExtractionStartedAt: getSqliteTimestamp(),
    });
    try {
      const dataset = await findOrCreateDataset(
        crawlPage.extraction.recipe.catalogueId,
        crawlPage.extractionId
      );

      if (!dataset) throw new Error("Could not find or create dataset");

      const content = await readMarkdownContent(
        crawlPage.extractionId,
        crawlPage.crawlStepId,
        crawlPage.id
      );
      const screenshot = await readScreenshot(
        crawlPage.extractionId,
        crawlPage.crawlStepId,
        crawlPage.id
      );
      const coursesData = await extractCourseDataItem({
        url: crawlPage.url,
        content,
        screenshot,
        logApiCalls: { extractionId: crawlPage.extractionId },
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
  }
);

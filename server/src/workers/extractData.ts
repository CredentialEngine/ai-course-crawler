import { createProcessor, ExtractDataJob, ExtractDataProgress } from ".";
import { createDataItem, findOrCreateDataset } from "../data/datasets";
import { findPageForJob, updatePage } from "../data/extractions";
import {
  CourseStructuredData,
  ExtractionStatus,
  getSqliteTimestamp,
  readMarkdownContent,
  readScreenshot,
  TextInclusion,
} from "../data/schema";
import { extractCourseData } from "../extraction/llm/extractCourseData";
import { focusedExtractCourseData } from "../extraction/llm/focusedExtractCourseData";

function preprocessText(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9.\-_'&]/g, "");
}

async function verifyTextInclusion(
  course: CourseStructuredData,
  content: string
): Promise<TextInclusion> {
  const result: TextInclusion = {} as TextInclusion;

  for (const [key, value] of Object.entries(course)) {
    if (value !== undefined && value !== null) {
      const preprocessedValue = preprocessText(String(value));
      result[key as keyof TextInclusion] = {
        full: content.includes(preprocessedValue),
      };
    }
  }

  return result;
}

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
      const coursesData = await extractCourseData({
        url: crawlPage.url,
        content,
        screenshot,
        logApiCalls: { extractionId: crawlPage.extractionId },
      });
      if (!coursesData) {
        throw new Error("Couldn't find course data");
      }
      const preprocessedContent = preprocessText(content);
      for (let course of coursesData) {
        let textInclusion = await verifyTextInclusion(
          course,
          preprocessedContent
        );
        if (!textInclusion.course_description.full) {
          const focusedCourseData = await focusedExtractCourseData(
            {
              url: crawlPage.url,
              content,
              screenshot,
              logApiCalls: { extractionId: crawlPage.extractionId },
            },
            course,
            textInclusion
          );
          if (focusedCourseData) {
            course = focusedCourseData;
            textInclusion = await verifyTextInclusion(
              course,
              preprocessedContent
            );
          }
        }
        await createDataItem(crawlPage.id, dataset.id, course, textInclusion);
      }
    } catch (err) {
      console.log(err);
      throw err;
    }
  }
);

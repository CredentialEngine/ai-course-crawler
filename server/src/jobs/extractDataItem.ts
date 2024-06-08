import { DataExtractionProgress, DataItemExtractionJob, Processor } from ".";
import {
  createDataItem,
  findOrCreateCatalogueData,
} from "../data/catalogueData";
import { findStepItem } from "../data/extractions";
import { EXTRACTION_LOG_LEVELS } from "../data/schema";
import { extractCourseDataItem } from "../extraction/extractCourseDataItem";
import { assertExtraction, logAndNotify } from "./extractionUtils";

const extractData: Processor<
  DataItemExtractionJob,
  DataExtractionProgress
> = async (job) => {
  await logAndNotify(job, "Performing data extraction");
  const extraction = await assertExtraction(job);
  const catalogueData = await findOrCreateCatalogueData(extraction.id);
  const stepItem = await findStepItem(job.data.stepItemId);
  if (!stepItem) {
    const message = `Couldn't find step item ${job.data.stepItemId}`;
    await logAndNotify(job, message, EXTRACTION_LOG_LEVELS.ERROR);
    return;
  }
  await logAndNotify(
    job,
    `Extracting course data for URL ${stepItem.url}, step item ${stepItem.id}`
  );
  const courseData = await extractCourseDataItem(
    stepItem.url,
    stepItem.content,
    stepItem.screenshot!
  );
  if (!courseData) {
    await logAndNotify(
      job,
      `Couldn't extract data for step item ${stepItem.id}`,
      EXTRACTION_LOG_LEVELS.ERROR
    );
    return;
  }
  await createDataItem(catalogueData.id, stepItem.id, courseData);
};

export default extractData;

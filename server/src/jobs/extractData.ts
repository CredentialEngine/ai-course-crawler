import { ExtractDataJob, Processor } from ".";
import {
  createDataItem,
  findOrCreateCatalogueData,
} from "../data/catalogueData";
import { findStepItemForJob } from "../data/extractions";
import { extractCourseDataItem } from "../extraction/extractCourseDataItem";

const extractData: Processor<ExtractDataJob, ExtractDataJob> = async (job) => {
  const stepItem = await findStepItemForJob(job.data.stepItemId);
  const catalogueData = await findOrCreateCatalogueData(
    stepItem.extractionStep.extractionId
  );
  const coursesData = await extractCourseDataItem(
    stepItem.url,
    stepItem.content!,
    stepItem.screenshot!
  );
  if (!coursesData) {
    throw new Error("Couldn't find course data");
  }
  for (const course of coursesData) {
    await createDataItem(catalogueData.id, stepItem.id, course);
  }
};

export default extractData;

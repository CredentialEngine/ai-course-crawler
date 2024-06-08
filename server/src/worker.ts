import Bull from "bull";
import "dotenv/config";
import path from "path";
import { Queues, startProcessor } from "./jobs";

function processorPath(name: string) {
  return path.join(__dirname, "jobs", `${name}.js`);
}

const processors: [Bull.Queue, string, number][] = [
  [Queues.DetectConfiguration, processorPath("detectConfiguration"), 5],
  [Queues.FetchCategoryLinks, processorPath("fetchCategoryLinks"), 5],
  [Queues.FetchCourseLinks, processorPath("fetchCourseLinks"), 5],
  [Queues.FetchPaginatedUrls, processorPath("fetchPaginatedUrls"), 5],
  [Queues.ExtractCourseCatalogue, processorPath("extractCourseCatalogue"), 5],
  [Queues.ExtractDataItem, processorPath("extractDataItem"), 5],
];

for (const [queue, processor, concurrency] of processors) {
  startProcessor(queue, processor, concurrency);
}

import Bull from "bull";

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";

export interface BaseProgress {
  recordId: number;
  status?: "info" | "success" | "failure";
  message: string;
  shouldRefetch?: boolean;
}

export interface DetectConfigurationJob {
  recipeId: number;
}

export interface DetectConfigurationProgress extends BaseProgress {}

export interface BaseExtractionJob {
  extractionId: number;
}

export interface ExtractionStepJob extends BaseExtractionJob {
  stepId: number;
}

export interface DataItemExtractionJob extends BaseExtractionJob {
  stepItemId: number;
}

export interface ExtractCourseCatalogueProgress extends BaseProgress {}

export interface DataExtractionProgress extends BaseProgress {}

export interface JobWithProgress<T, K> extends Bull.Job<T> {
  progress(): any;
  progress(p: K): void;
}

export const Queues = {
  DetectConfiguration: new Bull<DetectConfigurationJob>(
    "recipes.detectConfiguration",
    REDIS_URL
  ),
  ExtractCourseCatalogue: new Bull<BaseExtractionJob>(
    "extractions.extractCourseCatalogue",
    REDIS_URL
  ),
  FetchPaginatedUrls: new Bull<ExtractionStepJob>(
    "extractions.fetchPaginatedUrls",
    REDIS_URL
  ),
  FetchCategoryLinks: new Bull<ExtractionStepJob>(
    "extractions.fetchCategoryLinks",
    REDIS_URL
  ),
  FetchCourseLinks: new Bull<ExtractionStepJob>(
    "extractions.fetchCourseLinks",
    REDIS_URL
  ),
  ExtractDataItem: new Bull<DataItemExtractionJob>(
    "extractions.extractDataItem",
    REDIS_URL
  ),
};

export type Processor<T, K> = (job: JobWithProgress<T, K>) => Promise<void>;

export async function submitJob<T, K extends T>(queue: Bull.Queue<T>, data: K) {
  queue.add(data);
}

export function startProcessor<T, _K>(
  queue: Bull.Queue<T>,
  processor: string,
  concurrency: number = 1
) {
  queue.process(concurrency, processor);
  queue.on("error", (err) => console.log(err));
}

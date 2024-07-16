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

export interface FetchPageJob {
  stepItemId: number;
}

export interface FetchPageProgress extends BaseProgress {}

export interface ExtractDataJob {
  stepItemId: number;
}

export interface ExtractDataProgress extends BaseProgress {}

export interface JobWithProgress<T, K> extends Bull.Job<T> {
  progress(): any;
  progress(p: K): void;
}

export const Queues = {
  DetectConfiguration: new Bull<DetectConfigurationJob>(
    "recipes.detectConfiguration",
    REDIS_URL
  ),
  FetchPage: new Bull<FetchPageJob>("extractions.fetchPage", REDIS_URL),
  ExtractData: new Bull<ExtractDataJob>("extractions.extractData", REDIS_URL),
};

export interface GenericProgress {}

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
  queue.on("failed", (_job, err) => console.log(err));
  queue.on("progress", (_job, progress) => console.log(progress));
}

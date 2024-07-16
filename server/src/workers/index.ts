import { Job, Queue, QueueEvents, Worker } from "bullmq";
import { default as IORedis } from "ioredis";

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";

function getConnection() {
  return new IORedis(REDIS_URL, { maxRetriesPerRequest: null });
}

export interface BaseProgress extends Object {
  status?: "info" | "success" | "failure";
  message: string;
}

export interface JobWithProgress<T, K extends BaseProgress> extends Job<T> {
  updateProgress(progress: number | K): Promise<void>;
}

export type Processor<T, K extends BaseProgress> = (
  job: JobWithProgress<T, K>
) => Promise<void>;

export async function submitJob<T, K extends T>(
  queue: Queue<T>,
  data: K,
  name?: string
) {
  name = name || "default";
  queue.add(name, data);
}

export function startProcessor<T>(
  queue: Queue<T>,
  processor: string,
  localConcurrency: number = 1
) {
  const worker = new Worker(queue.name, processor, {
    connection: getConnection(),
    useWorkerThreads: true,
    concurrency: localConcurrency,
  });
  worker.on("error", (err) => console.log(err));
  const queueEvents = new QueueEvents(queue.name);
  queueEvents.on("error", (err) => console.log(err));
  queueEvents.on("failed", (_job, err) => console.log(err));
  queueEvents.on("progress", (_job, progress) => console.log(progress));
}

export interface DetectConfigurationJob {
  recipeId: number;
}

export interface FetchPageJob {
  stepItemId: number;
}

export interface ExtractDataJob {
  stepItemId: number;
}

export interface DetectConfigurationProgress extends BaseProgress {}
export interface FetchPageProgress extends BaseProgress {}
export interface ExtractDataProgress extends BaseProgress {}

export const Queues = {
  DetectConfiguration: new Queue<DetectConfigurationJob>(
    "recipes.detectConfiguration",
    {
      connection: getConnection(),
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: "exponential",
          delay: 1000,
        },
      },
    }
  ),
  FetchPage: new Queue<FetchPageJob>("extractions.fetchPage", {
    connection: getConnection(),
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 1000,
      },
    },
  }),
  ExtractData: new Queue<ExtractDataJob>("extractions.extractData", {
    connection: getConnection(),
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 1000,
      },
    },
  }),
};

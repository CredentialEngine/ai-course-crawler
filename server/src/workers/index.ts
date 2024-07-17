import { Queue, SandboxedJob, Worker } from "bullmq";
import { default as IORedis } from "ioredis";

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";

export function getRedisConnection() {
  const connection = new IORedis(REDIS_URL, { maxRetriesPerRequest: null });
  connection.setMaxListeners(30);
  return connection;
}

export interface BaseProgress {
  status?: "info" | "success" | "failure";
  message: string;
}

export interface JobWithProgress<T, K extends BaseProgress>
  extends SandboxedJob<T> {
  updateProgress(value: object | number): Promise<void>;
  updateProgress(value: K): Promise<void>;
}

export type Processor<T, K extends BaseProgress> = (
  job: JobWithProgress<T, K>
) => Promise<void>;

export async function submitJob<T, K extends T>(
  queue: Queue<T>,
  data: K,
  name?: string
) {
  name = name || `${queue.name}.default`;
  queue.add(name, data);
}

export function startProcessor<T>(
  queue: Queue<T>,
  processor: string,
  localConcurrency: number = 1
) {
  const worker = new Worker(queue.name, processor, {
    connection: getRedisConnection(),
    useWorkerThreads: false,
    concurrency: localConcurrency,
  });
  return worker;
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
      connection: getRedisConnection(),
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
    connection: getRedisConnection(),
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 1000,
      },
    },
  }),
  ExtractData: new Queue<ExtractDataJob>("extractions.extractData", {
    connection: getRedisConnection(),
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 1000,
      },
    },
  }),
};

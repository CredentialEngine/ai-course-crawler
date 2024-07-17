import { Queue, QueueEvents, Worker } from "bullmq";
import "dotenv/config";
import path from "path";
import { getRedisConnection, Queues, startProcessor } from "./workers";

const workers: Worker[] = [];

let shuttingDown = false;

async function handleShutdown() {
  if (shuttingDown) {
    return;
  }
  shuttingDown = true;
  for (const worker of workers) {
    console.log(`Shutting down worker ${worker.name}`);
    await worker.close();
  }
  process.exit(0);
}

function processorPath(name: string) {
  return path.join(__dirname, "workers", `${name}.js`);
}

const processors: [Queue, string, number][] = [
  [Queues.DetectConfiguration, processorPath("detectConfiguration"), 1],
  [Queues.FetchPage, processorPath("fetchPage"), 2],
  [Queues.ExtractData, processorPath("extractData"), 10],
];

for (const [queue, processor, localConcurrency] of processors) {
  const queueEvents = new QueueEvents(queue.name, {
    connection: getRedisConnection(),
  });
  queueEvents.on("error", (err) => console.log(err));
  queueEvents.on("failed", (_job, err) => console.log(err));
  queueEvents.on("progress", (_job, progress) => console.log(progress));

  workers.push(startProcessor(queue, processor, localConcurrency));
}

process.on("SIGINT", handleShutdown);
process.on("SIGTERM", handleShutdown);

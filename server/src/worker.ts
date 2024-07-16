import { Queue } from "bullmq";
import "dotenv/config";
import path from "path";
import { closeCluster } from "./extraction/browser";
import { Queues, startProcessor } from "./workers";

async function handleShutdown() {
  await closeCluster();
  process.exit(0);
}

function processorPath(name: string) {
  return path.join(__dirname, "workers", `${name}.js`);
}

const processors: [Queue, string, number][] = [
  [Queues.DetectConfiguration, processorPath("detectConfiguration"), 2],
  [Queues.FetchPage, processorPath("fetchPage"), 2],
  [Queues.ExtractData, processorPath("extractData"), 100],
];

for (const [queue, processor, localConcurrency] of processors) {
  startProcessor(queue, processor, localConcurrency);
}

process.on("SIGINT", handleShutdown);
process.on("SIGTERM", handleShutdown);

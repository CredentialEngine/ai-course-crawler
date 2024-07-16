import Bull from "bull";
import "dotenv/config";
import path from "path";
import { Queues, startProcessor } from "./jobs";

function processorPath(name: string) {
  return path.join(__dirname, "jobs", `${name}.js`);
}

const processors: [Bull.Queue, string, number][] = [
  [Queues.DetectConfiguration, processorPath("detectConfiguration"), 2],
  [Queues.FetchPage, processorPath("fetchPage"), 2],
  [Queues.ExtractData, processorPath("extractData"), 2],
];

for (const [queue, processor, concurrency] of processors) {
  startProcessor(queue, processor, concurrency);
}

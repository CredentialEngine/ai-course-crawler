import "dotenv/config";
import { inspect } from "util";
import recursivelyDetectConfiguration from "./extraction/recursivelyDetectConfiguration";

async function testDetect(url: string) {
  const configuration = await recursivelyDetectConfiguration(url);
  console.log(inspect(configuration));
  return configuration;
}

const url = process.argv[2];
testDetect(url);

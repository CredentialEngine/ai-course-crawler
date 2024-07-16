import "dotenv/config";
import { inspect } from "util";
import { getBrowser } from "./extraction/browser";
import recursivelyDetectConfiguration from "./extraction/recursivelyDetectConfiguration";

async function testDetect(url: string) {
  const browser = await getBrowser();
  try {
    const configuration = await recursivelyDetectConfiguration(browser, url);
    return configuration;
  } finally {
    browser.close();
  }
}

const url = process.argv[2];
testDetect(url).then((config) => {
  console.log("Detected configuration:");
  console.log(inspect(config));
});

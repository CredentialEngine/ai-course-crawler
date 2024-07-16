import * as cheerio from "cheerio";
import puppeteer, { Browser } from "puppeteer";
import TurndownService from "turndown";
import { exponentialRetry } from "../utils";

export interface Page {
  url: string;
  content: string;
  screenshot?: string;
}

function isValidBase64(str: string) {
  if (typeof str !== "string" || str.length === 0) {
    return false;
  }

  try {
    Buffer.from(str, "base64").toString("utf8");
    return true;
  } catch (e) {
    return false;
  }
}

export async function getBrowser() {
  return puppeteer.launch({
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
}

export async function loadPage(
  browser: Browser,
  url: string,
  captureScreenshot: boolean = true
): Promise<Page> {
  let screenshot: string | undefined;
  const page = await browser.newPage();

  try {
    await exponentialRetry(() => page.goto(url), 5);

    const content = await page.content();

    if (captureScreenshot) {
      screenshot = await page.screenshot({
        type: "webp",
        encoding: "base64",
        fullPage: true,
        quality: 60,
      });
      if (!isValidBase64(screenshot)) {
        console.log("Screenshot is not valid base 64");
        screenshot = undefined;
      }
    }

    return {
      url,
      content,
      screenshot,
    };
  } finally {
    await page.close();
  }
}

export interface LoadAllConfiguration {
  batchSize?: number;
  beforeLoad?: (url: string) => Promise<void>;
  onLoad?: (url: string, content: string) => Promise<void>;
}

export async function loadAll(
  browser: Browser,
  urls: string[],
  config: LoadAllConfiguration = {}
): Promise<Page[]> {
  const batchSize = config.batchSize || 5;
  const results = [];

  for (let i = 0; i < urls.length; i += batchSize) {
    const batch = urls.slice(i, i + batchSize);
    const promises = batch.map((url) =>
      (async () => {
        const page = await browser.newPage();
        if (config.beforeLoad) {
          config.beforeLoad(url);
        }
        try {
          await exponentialRetry(() => page.goto(url), 5);
          const content = await page.content();
          const screenshot = await page.screenshot({
            type: "webp",
            encoding: "base64",
            fullPage: true,
            quality: 60,
          });
          if (config.onLoad) {
            config.onLoad(url, content);
          }
          return { url, content, screenshot };
        } finally {
          await page.close();
        }
      })()
    );
    results.push(...(await Promise.all(promises)));
  }

  return results;
}

export async function simplifyHtml(html: string) {
  const $ = cheerio.load(html);
  $("head").empty();
  const elms = $("*").toArray();
  for (const elm of elms) {
    const $elm = $(elm);
    if (elm.type !== "tag" && elm.type !== "text") {
      $elm.remove();
      continue;
    }
    if (elm.type !== "tag") {
      continue;
    }
    if (elm.tagName == "link") {
      $elm.remove();
      continue;
    }
    for (var attribute in elm.attribs) {
      if (attribute == "href") {
        continue;
      }
      $elm.removeAttr(attribute);
    }
    if (elm.tagName !== "div") {
      continue;
    }
    let childElementCount = 0;
    let childTextFound = false;
    let divChildFound = false;
    for (const child of elm.children) {
      if (child.type === "text" && child.data.trim()) {
        childTextFound = true;
      } else if (child.type === "tag") {
        childElementCount++;
        if (childElementCount > 1) {
          break;
        }
        if (child.tagName === "div") {
          divChildFound = true;
        }
      }
    }
    if (!childTextFound && !childElementCount) {
      $elm.remove();
      continue;
    }
    if (childTextFound || childElementCount > 1 || !divChildFound) {
      continue;
    }
    // Remove redundant divs
    $elm.replaceWith($elm.children());
  }
  return $.html();
}

export async function toMarkdown(html: string) {
  return new TurndownService().turndown(html);
}

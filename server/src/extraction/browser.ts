import * as cheerio from "cheerio";
import { Cluster } from "puppeteer-cluster";
import TurndownService from "turndown";
import { resolveAbsoluteUrl } from "../utils";

export interface BrowserTaskInput {
  url: string;
}

export interface BrowserTaskResult {
  url: string;
  content: string;
  screenshot?: string;
}

let cluster: Cluster<BrowserTaskInput, BrowserTaskResult> | undefined;
let clusterClosed = false;

export async function getCluster() {
  if (clusterClosed) {
    throw new Error("Cluster has been closed");
  }
  if (cluster) {
    return cluster;
  }
  cluster = await Cluster.launch({
    concurrency: Cluster.CONCURRENCY_CONTEXT,
    maxConcurrency: 2,
    puppeteerOptions: {
      args: ["--font-render-hinting=none", "--force-gpu-mem-available-mb=4096"],
    },
  });
  await cluster.task(async ({ page, data }) => {
    const { url } = data;
    let screenshot: string | undefined;
    await page.goto(url);
    const content = await page.content();
    screenshot = await page.screenshot({
      type: "webp",
      encoding: "base64",
      fullPage: false,
      quality: 60,
    });
    if (!isValidBase64(screenshot)) {
      console.log("Screenshot is not valid base 64");
      screenshot = undefined;
    }
    return {
      url,
      content,
      screenshot,
    };
  });
  return cluster;
}

export async function closeCluster() {
  if (!cluster) {
    return;
  }

  clusterClosed = true;
  await cluster.idle();
  await cluster.close();
}

export async function fetchBrowserPage(url: string) {
  const cluster = await getCluster();
  return cluster.execute({ url });
}

export async function fetchPreview(url: string) {
  const res = await fetch(url);
  const text = await res.text();
  const $ = cheerio.load(text);
  const title = $('meta[name="og:title"]').attr("content") || $("title").text();
  const description = $('meta[name="og:description"]').attr("content");
  let thumbnailUrl =
    $('meta[name="og:image"]').attr("content") || $("img").first().attr("src");
  thumbnailUrl = thumbnailUrl
    ? resolveAbsoluteUrl(url, thumbnailUrl)
    : undefined;

  return { title, thumbnailUrl, description };
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

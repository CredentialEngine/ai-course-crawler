import { Browser } from "puppeteer";
import { PAGE_DATA_TYPE, PaginationConfiguration } from "../data/schema";
import { loadPage } from "../extraction/browser";
import extractDetailUrls from "../extraction/extractDetailUrls";

const constructPaginatedUrls = (configuration: PaginationConfiguration) => {
  const urls = [];
  if (configuration.urlPatternType == "offset") {
    // TODO: implement offset logic
    return [];
  } else if (configuration.urlPatternType == "page_num") {
    for (let i = 1; i <= configuration.totalPages; i++) {
      urls.push(configuration.urlPattern.replace("{page_num}", i.toString()));
    }
    return urls;
  } else {
    throw new Error("Unknown pagination pattern type");
  }
};

const bestOutOf = async <T>(
  times: number,
  fn: () => Promise<T>,
  compareWithFn: (result: T) => string
) => {
  const results = new Map<string, { count: number; result: T }>();
  let bestResult: T | undefined;
  let maxCount = 0;

  for (let i = 0; i < times; i++) {
    const result = await fn();
    const compareResult = compareWithFn(result);
    const resultCount = (results.get(compareResult)?.count || 0) + 1;
    results.set(compareResult, { count: resultCount + 1, result });

    if (resultCount > maxCount) {
      maxCount = resultCount;
      bestResult = result;
    }
  }

  return bestResult as T;
};

const extractDetailUrlsForPage = async (
  browser: Browser,
  dataType: PAGE_DATA_TYPE,
  url: string
) => {
  const page = await loadPage(browser, url, true);
  const detailUrlRegexp = await extractDetailUrls(
    url,
    page.content,
    page.screenshot!,
    dataType
  );

  if (!detailUrlRegexp) {
    throw new Error(`Couldn't find detail regexp for ${url}.`);
  }

  const pageUrls = await detailUrlRegexp.extract(url, page.content);

  if (!pageUrls?.length) {
    throw new Error(
      `Regexp for ${url} did not work: ${detailUrlRegexp.regexp}`
    );
  }

  return detailUrlRegexp;
};

export { bestOutOf, constructPaginatedUrls, extractDetailUrlsForPage };

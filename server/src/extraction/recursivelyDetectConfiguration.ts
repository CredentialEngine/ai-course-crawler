import { inspect } from "util";
import { PAGE_DATA_TYPE, RecipeConfiguration } from "../data/schema";
import { detectPageType } from "../extraction/detectPageType";
import { detectPagination } from "../extraction/detectPagination";
import detectUrlRegexp, {
  createUrlExtractor,
} from "../extraction/detectUrlRegexp";
import { bestOutOf, exponentialRetry, unique } from "../utils";
import { fetchBrowserPage } from "./browser";

const sample = <T>(arr: T[], sampleSize: number) =>
  arr.sort(() => 0.5 - Math.random()).slice(0, sampleSize);

const detectConfiguration = async (url: string) => {
  const { content, screenshot } = await fetchBrowserPage(url);
  console.log(`Detecting page type for ${url}`);
  const pageType = await bestOutOf(
    5,
    () =>
      exponentialRetry(
        async () => detectPageType(url, content, screenshot),
        10
      ),
    (t) => t as string
  );
  console.log(`Detected as ${pageType}`);
  if (!pageType) {
    throw new Error(`Couldn't detect page type for URL ${url}`);
  }
  console.log(`Detecting pagination for ${url}`);
  const pagination = await bestOutOf(
    5,
    () =>
      exponentialRetry(
        async () => detectPagination(url, content, pageType, screenshot),
        10
      ),
    (p) => inspect(p)
  );
  console.log(`Detected as: ${inspect(pagination)}`);
  let linkRegexp;
  if (
    pageType == PAGE_DATA_TYPE.CATEGORY_LINKS_PAGE ||
    pageType == PAGE_DATA_TYPE.COURSE_LINKS_PAGE
  ) {
    console.log(`Detecting regexp for ${url}`);
    linkRegexp = await bestOutOf(
      5,
      () =>
        exponentialRetry(
          async () => detectUrlRegexp(pageType, content, screenshot),
          10
        ),
      (r) => r.source
    );
    console.log(`Detect as ${linkRegexp}`);
  }
  return {
    content,
    linkRegexp,
    pageType,
    pagination,
    screenshot,
    url,
  };
};

const recursivelyDetectConfiguration = async (
  url: string,
  depth: number = 1
) => {
  if (depth > 3) {
    throw new Error("Exceeded max category depth");
  }

  console.log("Detecting configuration for root page");
  const { content, linkRegexp, pageType, pagination } =
    await detectConfiguration(url);

  const configuration: RecipeConfiguration = {
    pageType,
    linkRegexp: linkRegexp?.source,
    pagination,
  };

  if (pageType == PAGE_DATA_TYPE.COURSE_DETAIL_PAGE) {
    // We are already at the course details page.
    return configuration;
  } else {
    // This is either a course links page or a course category links page.

    const urlExtractor = createUrlExtractor(linkRegexp!);
    const urls = await urlExtractor(url, content);

    // Extract some sample pages which we'll use to confirm the page type.
    console.log("Detecting configuration for sample child pages");
    console.log(`There are ${urls.length} URLs and we're sampling 5`);
    const samplePageConfigs = await Promise.all(
      sample(urls, 5).map(async (url) => detectConfiguration(url))
    );

    const mixedContent =
      unique(samplePageConfigs.map((spc) => spc.pageType)).length > 1;

    if (mixedContent) {
      // If the LLM detects mixed content in the child pages, something is probably off; abort.
      throw new Error("Couldn't determine page type for links");
    }

    const childPage = samplePageConfigs[0];

    configuration.links = {
      pageType: childPage.pageType,
      linkRegexp: childPage.linkRegexp?.source,
      pagination: childPage.pagination,
    };

    if (
      pageType == PAGE_DATA_TYPE.COURSE_LINKS_PAGE &&
      childPage.pageType != PAGE_DATA_TYPE.COURSE_DETAIL_PAGE
    ) {
      throw new Error(
        `Detected course links page and expected course detail pages, but child pages are ${childPage.pageType}`
      );
    }

    if (childPage.pageType == PAGE_DATA_TYPE.COURSE_DETAIL_PAGE) {
      return configuration;
    }

    const childUrlExtractor = createUrlExtractor(childPage.linkRegexp!);
    const childUrls = await childUrlExtractor(childPage.url, childPage.content);

    console.log("Detecting configuration for sample child > child pages");
    const sampleChildPageConfigs = await Promise.all(
      sample(childUrls, 5).map(async (url) => detectConfiguration(url))
    );

    const mixedChildContent =
      unique(sampleChildPageConfigs.map((spc) => spc.pageType)).length > 1;

    if (mixedChildContent) {
      // If the LLM detects mixed content in the child pages, something is probably off; abort.
      throw new Error("Couldn't determine page type for child links");
    }

    const childLinkPage = sampleChildPageConfigs[0];

    configuration.links.links = {
      pageType: childLinkPage.pageType,
      linkRegexp: childLinkPage.linkRegexp?.source,
      pagination: childLinkPage.pagination,
    };

    if (childPage.pageType == PAGE_DATA_TYPE.COURSE_LINKS_PAGE) {
      if (childLinkPage.pageType != PAGE_DATA_TYPE.COURSE_DETAIL_PAGE) {
        throw new Error(
          `Detected course links page and expected course detail pages, but child pages are ${childLinkPage.pageType}`
        );
      }
      return configuration;
    } else if (childPage.pageType == PAGE_DATA_TYPE.CATEGORY_LINKS_PAGE) {
      configuration.links.links.links = await recursivelyDetectConfiguration(
        childLinkPage.url,
        depth + 1
      );
    }

    return configuration;
  }
};

export default recursivelyDetectConfiguration;

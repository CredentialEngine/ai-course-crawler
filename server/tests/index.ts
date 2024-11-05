import { expect } from "vitest";
import { CourseStructuredData, RecipeConfiguration } from "../src/data/schema";
import {
  fetchBrowserPage,
  simplifiedMarkdown,
} from "../src/extraction/browser";
import { extractAndVerifyCourseData } from "../src/extraction/llm/extractAndVerifyCourseData";
import recursivelyDetectConfiguration from "../src/extraction/recursivelyDetectConfiguration";

export const EXTRACTION_TIMEOUT = 1000 * 60 * 10;

// Recipes can take a long time, let's wait for up to 30mins.
export const RECIPE_TIMEOUT = 1000 * 60 * 30;

function matchesUrlPattern(expected: string, actual: string): boolean {
  const expectedUrl = new URL(expected);
  const actualUrl = new URL(actual);

  if (expectedUrl.origin !== actualUrl.origin) return false;

  if (expectedUrl.pathname !== actualUrl.pathname) return false;

  const expectedParams = Object.fromEntries(expectedUrl.searchParams.entries());
  const actualParams = Object.fromEntries(actualUrl.searchParams.entries());

  return Object.entries(expectedParams).every(([key, value]) => {
    return (
      actualParams[key] === value ||
      (value === "{page_num}" && actualParams[key]?.includes("{page_num}")) ||
      (value === "{offset}" && actualParams[key]?.includes("{offset}"))
    );
  });
}

export async function assertConfiguration(
  url: string,
  expected: RecipeConfiguration & { sampleLinks?: string[] }
): Promise<void> {
  const actual = await recursivelyDetectConfiguration(url);

  console.log(actual);
  expect(actual.pageType).toBe(expected.pageType);

  if (expected.pagination) {
    expect(actual.pagination).toBeDefined();
    if (actual.pagination) {
      expect(actual.pagination.urlPatternType).toBe(
        expected.pagination.urlPatternType
      );
      expect(actual.pagination.totalPages).toBe(expected.pagination.totalPages);

      expect(
        matchesUrlPattern(
          expected.pagination.urlPattern,
          actual.pagination.urlPattern
        ),
        `Expected URL pattern to match ${expected.pagination.urlPattern}, got ${actual.pagination.urlPattern}`
      ).toBe(true);
    }
  } else {
    expect(actual.pagination).toBeUndefined();
  }

  if (expected.links) {
    expect(actual.links).toBeDefined();
    if (actual.links) {
      expect(actual.links.pageType).toBe(expected.links.pageType);
    }
  } else {
    expect(actual.links).toBeUndefined();
  }

  if (expected.sampleLinks && actual.linkRegexp) {
    const regexp = new RegExp(actual.linkRegexp);
    for (const link of expected.sampleLinks) {
      expect(
        regexp.test(link),
        `Expected link ${link} to match regexp ${actual.linkRegexp}`
      ).toBe(true);
    }
  }
}

export async function assertExtraction(
  url: string,
  expected: CourseStructuredData[]
) {
  const page = await fetchBrowserPage(url);
  if (!page?.content) {
    throw new Error(`Page ${url} not found`);
  }

  const simplifiedContent = await simplifiedMarkdown(page.content);

  const extraction = await extractAndVerifyCourseData({
    content: simplifiedContent,
    url: page.url,
    screenshot: page.screenshot?.toString("base64"),
  });

  for (const expectedCourse of expected) {
    const extractedCourse = extraction.find((course) =>
      course.course.course_id
        .toLowerCase()
        .replace(/[\W\s]+/g, "")
        .includes(
          expectedCourse.course_id.toLowerCase().replace(/[\W\s]+/g, "")
        )
    );
    if (!extractedCourse) {
      throw new Error(`Course ${expectedCourse.course_id} not found`);
    }
    for (const key in expectedCourse) {
      const expectedValue = expectedCourse[key as keyof CourseStructuredData];
      const extractedValue =
        extractedCourse.course[key as keyof CourseStructuredData];

      if (
        typeof expectedValue === "string" &&
        typeof extractedValue === "string"
      ) {
        expect(extractedValue.toLowerCase().replace(/[\W\s]+/g, "")).toContain(
          expectedValue.toLowerCase().replace(/[\W\s]+/g, "")
        );
      } else {
        if (extractedValue != expectedValue) {
          console.log(extractedCourse.course);
        }
        expect(extractedValue).toEqual(expectedValue);
      }
    }
  }
}

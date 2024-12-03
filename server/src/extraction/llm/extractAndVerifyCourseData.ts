import { DefaultLlmPageOptions } from ".";
import { CourseStructuredData, TextInclusion } from "../../data/schema";
import { extractCourseData } from "./extractCourseData";
import { focusedExtractCourseData } from "./focusedExtractCourseData";

function preprocessText(text: string): string {
  return text
    .toLowerCase()
    .replace(/(?<!\!)\[([^\]]+)\]\([^)]*\)/g, "$1") // remove MD links
    .replace(/[^a-z0-9]/g, "");
}

async function verifyTextInclusion(
  course: CourseStructuredData,
  content: string
): Promise<TextInclusion> {
  const result: TextInclusion = {} as TextInclusion;

  for (const [key, value] of Object.entries(course)) {
    if (value !== undefined && value !== null) {
      const preprocessedValue = preprocessText(String(value));
      result[key as keyof TextInclusion] = {
        full: content.includes(preprocessedValue),
      };
    }
  }

  return result;
}

async function verifyAndRetryExtraction(
  course: CourseStructuredData,
  options: DefaultLlmPageOptions,
  preprocessedContent: string
): Promise<{ course: CourseStructuredData; textInclusion: TextInclusion }> {
  let textInclusion = await verifyTextInclusion(course, preprocessedContent);
  let retryCount = 0;
  const MAX_RETRIES = 3;

  // Retry focused extraction if the text inclusion is not complete for ID, description and prereqs
  while (
    retryCount < MAX_RETRIES &&
    (!textInclusion.course_id?.full ||
      !textInclusion.course_description?.full ||
      (textInclusion.course_prerequisites &&
        !textInclusion.course_prerequisites.full))
  ) {
    const focusedCourseData = await focusedExtractCourseData(
      options,
      course,
      textInclusion
    );
    if (focusedCourseData) {
      course = focusedCourseData;
      textInclusion = await verifyTextInclusion(course, preprocessedContent);
    }
    retryCount++;
  }

  return { course, textInclusion };
}

export async function extractAndVerifyCourseData(
  options: DefaultLlmPageOptions
): Promise<{ course: CourseStructuredData; textInclusion: TextInclusion }[]> {
  const coursesData = await extractCourseData(options);
  if (!coursesData) {
    throw new Error("Couldn't find course data");
  }

  const preprocessedContent = preprocessText(options.content);
  const results = [];

  for (const course of coursesData) {
    const verifiedExtraction = await verifyAndRetryExtraction(
      course,
      options,
      preprocessedContent
    );
    results.push(verifiedExtraction);
  }

  return results;
}

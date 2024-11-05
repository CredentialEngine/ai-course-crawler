import { DefaultLlmPageOptions } from ".";
import { CourseStructuredData, TextInclusion } from "../../data/schema";
import { extractCourseData } from "./extractCourseData";
import { focusedExtractCourseData } from "./focusedExtractCourseData";

function preprocessText(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9.]/g, "");
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

export async function extractAndVerifyCourseData(
  options: DefaultLlmPageOptions
): Promise<{ course: CourseStructuredData; textInclusion: TextInclusion }[]> {
  const coursesData = await extractCourseData(options);
  if (!coursesData) {
    throw new Error("Couldn't find course data");
  }

  const preprocessedContent = preprocessText(options.content);
  const results = [];

  for (let course of coursesData) {
    let textInclusion = await verifyTextInclusion(course, preprocessedContent);

    if (
      !textInclusion.course_id?.full ||
      !textInclusion.course_description?.full
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
    }

    results.push({ course, textInclusion });
  }

  return results;
}

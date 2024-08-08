import {
  ChatCompletionContentPart,
  ChatCompletionMessageParam,
} from "openai/resources/chat/completions";
import { CourseStructuredData } from "../../appRouter";
import { assertArray, simpleToolCompletion } from "../../openai";
import { simplifyHtml, toMarkdown } from "../browser";

export async function extractCourseDataItem(
  url: string,
  html: string,
  screenshot: string
) {
  const content = await toMarkdown(await simplifyHtml(html));
  const prompt = `
Your goal is to extract course data from this page.

We are looking for the following fields:

Course identifier: code/identifier for the course (example: "AGRI 101")
Course name: name for the course (for example "Landscape Design")
Course description: the full description of the course
Course credits (min): min credit
Course credits (max): max credit (if the page shows a range).
  - If there is only a single credit information in the page, set it as the max.
Course credits type: infer it from the page (ref. one of the enum values)

PAGE URL:

${url}

SIMPLIFIED PAGE CONTENT:

${content}
`;

  const completionContent: ChatCompletionContentPart[] = [
    {
      type: "text",
      text: prompt,
    },
  ];

  if (screenshot) {
    completionContent.push({
      type: "image_url",
      image_url: { url: `data:image/webp;base64,${screenshot}` },
    });
  }

  const messages: ChatCompletionMessageParam[] = [
    {
      role: "user",
      content: completionContent,
    },
  ];
  const completion = await simpleToolCompletion(
    messages,
    "course_data",
    {
      courses: {
        type: "array",
        items: {
          type: "object",
          properties: {
            course_id: {
              type: "string",
            },
            course_name: {
              type: "string",
            },
            course_description: {
              type: "string",
            },
            course_credits_min: {
              type: "string",
            },
            course_credits_max: {
              type: "string",
            },
            course_credits_type: {
              type: "string",
              enum: [
                "AcademicYear",
                "CarnegieUnit",
                "CertificateCredit",
                "ClockHour",
                "CompetencyCredit",
                "ContactHour",
                "ContinuingEducationUnit",
                "DegreeCredit",
                "DualCredit",
                "QuarterHour",
                "RequirementCredit",
                "SecondaryDiplomaCredit",
                "SemesterHour",
                "TimeBasedCredit",
                "TypeBasedCredit",
              ],
            },
            requirements: {
              type: "array",
              items: {
                type: "string",
              },
            },
          },
          required: ["course_id", "course_name", "course_description"],
        },
      },
    },
    ["courses"]
  );
  if (!completion) {
    return [];
  }
  const courses = assertArray<CourseStructuredData>(completion, "courses");
  return courses.filter(
    (c) => c.course_id && c.course_name && c.course_description
  );
}
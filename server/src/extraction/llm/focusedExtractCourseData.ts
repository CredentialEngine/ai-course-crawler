import {
  ChatCompletionContentPart,
  ChatCompletionMessageParam,
} from "openai/resources/chat/completions";
import { DefaultLlmPageOptions } from ".";
import { CourseStructuredData } from "../../appRouter";
import { TextInclusion } from "../../data/schema";
import { simpleToolCompletion } from "../../openai";

const validCreditUnitTypes = [
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
  "UNKNOWN",
];

export async function focusedExtractCourseData(
  options: DefaultLlmPageOptions,
  course: CourseStructuredData,
  textInclusion: TextInclusion
) {
  const prompt = `
Your goal is to extract course data from this page for one specific course.

In a previous step, we asked you to extract the data, but we noticed there was an issue
with the course description.

Note you must extract data for the course EXACTLY as it is in the page, without adding or
removing anything.

Please do it correctly this time.

Your extraction was:

${JSON.stringify(course)}

We are looking for the following fields:

Course identifier: code/identifier for the course (example: "AGRI 101")
Course name: name for the course (for example "Landscape Design")
Course description: the full description of the course
Course credits (min): min credit
Course credits (max): max credit (if the page shows a range).
  - If there is only a single credit information in the page, set it as the max.
Course credits type: infer it from the page (ref. one of the enum values)
  - Only infer the type if it's clearly stated in the page somewhere
  - If you can't infer the type, set it as "UNKNOWN"

PAGE URL:

${options.url}

SIMPLIFIED PAGE CONTENT:

${options.content}
`;

  const completionContent: ChatCompletionContentPart[] = [
    {
      type: "text",
      text: prompt,
    },
  ];

  if (options?.screenshot) {
    completionContent.push({
      type: "image_url",
      image_url: { url: `data:image/webp;base64,${options.screenshot}` },
    });
  }

  const messages: ChatCompletionMessageParam[] = [
    {
      role: "user",
      content: completionContent,
    },
  ];
  const result = await simpleToolCompletion({
    messages,
    toolName: "course_data",
    parameters: {
      course: {
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
            enum: validCreditUnitTypes,
          },
        },
        required: ["course_id", "course_name", "course_description"],
      },
    },
    requiredParameters: ["course"],
    logApiCall: options?.logApiCalls
      ? {
          extractionId: options.logApiCalls.extractionId,
          callSite: "extractCourseDataItem",
        }
      : undefined,
  });
  return (result?.toolCallArgs?.course as CourseStructuredData) || null;
}

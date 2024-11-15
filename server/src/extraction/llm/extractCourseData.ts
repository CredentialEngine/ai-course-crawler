import {
  ChatCompletionContentPart,
  ChatCompletionMessageParam,
} from "openai/resources/chat/completions";
import { DefaultLlmPageOptions } from ".";
import { CourseStructuredData } from "../../appRouter";
import { assertArray, simpleToolCompletion } from "../../openai";

export const validCreditUnitTypes = [
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

export function processCourse(course: CourseStructuredData) {
  const processedCourse: CourseStructuredData = {
    course_id: course.course_id.trim(),
    course_name: course.course_name.trim(),
    course_description: course.course_description.trim(),
    course_credits_min: course.course_credits_min,
    course_credits_max: course.course_credits_max,
    course_credits_type: course.course_credits_type?.trim(),
    course_prerequisites: course.course_prerequisites?.trim(),
  };

  if (course.course_credits_type?.toUpperCase()?.trim() == "UNKNOWN") {
    processedCourse.course_credits_type = undefined;
  }
  if (
    course.course_credits_type &&
    !validCreditUnitTypes.includes(course.course_credits_type)
  ) {
    processedCourse.course_credits_type = undefined;
  }
  if (!course.course_prerequisites) {
    processedCourse.course_prerequisites = undefined;
  }
  if (typeof course.course_credits_min === "string") {
    if ((course.course_credits_min as string).trim().length) {
      processedCourse.course_credits_min = parseInt(course.course_credits_min);
    } else {
      processedCourse.course_credits_min = undefined;
    }
  }
  if (typeof course.course_credits_max === "string") {
    if ((course.course_credits_max as string).trim().length) {
      processedCourse.course_credits_max = parseInt(course.course_credits_max);
    } else {
      processedCourse.course_credits_max = undefined;
    }
  }
  return processedCourse;
}

export const basePrompt = `
We are looking for the following fields:

Course identifier: code/identifier for the course (example: "AGRI 101")

Course name: name for the course (for example "Landscape Design")

Course description: the full description of the course. If there are links, only extract the text.

Course prerequisites: if the text explicitly mentions any course prerequisite(s) or course requirements,
  extract them as is - the full text for prerequisites, as it may contain observations.
  (If there are links in the text, only extract the text without links.)
  - If it mentions course corequisites, leave blank.
  - If it mentions mutually exclusive courses, leave blank.
  - If it mentions courses that must be taken concurrently, leave blank.
  - Only extract the text if it's explicitly stated that the course has prerequisites/requirements.
  - Otherwise leave blank.

Course credits (min): min credit.

Course credits (max): max credit (if the page shows a range).
  - If there is only a single credit information in the page, set it as the max.

IMPORTANT:

IF THERE ARE NO CLEARLY STATED COURSE CREDITS INFORMATION, LEAVE BOTH FIELDS BLANK.
ONLY INCLUDE COURSE CREDITS INFORMATION IF IT'S EXPLICITLY STATED IN THE PAGE!

Course credits type: infer it from the page.
  - Only infer the type if it's CLEARLY stated in the page somewhere.
  - If you can't infer the type, set it as "UNKNOWN"
  - MUST BE either UNKNOWN or: ${validCreditUnitTypes.join(", ")}

It is ok to have the course credits set to a number and the course credits type set to "UNKNOWN"
if the content shows the credits value but doesn't mention the type.
`;

export async function extractCourseData(options: DefaultLlmPageOptions) {
  const additionalContext = options.additionalContext
    ? `
ADDITIONAL CONTEXT:

${options.additionalContext.message}

${(options.additionalContext.context ?? []).join("\n")}
`
    : "";

  const prompt = `
Your goal is to extract course data from this page.

${basePrompt}

${additionalContext}

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
              enum: validCreditUnitTypes,
            },
            course_prerequisites: {
              type: "string",
            },
          },
          required: ["course_id", "course_name", "course_description"],
        },
      },
    },
    requiredParameters: ["courses"],
    logApiCall: options?.logApiCalls
      ? {
          extractionId: options.logApiCalls.extractionId,
          callSite: "extractCourseDataItem",
        }
      : undefined,
  });
  if (!result || !result.toolCallArgs) {
    return [];
  }
  const courses = assertArray<CourseStructuredData>(
    result.toolCallArgs,
    "courses"
  );
  return courses
    .filter((c) => c.course_id && c.course_name && c.course_description)
    .map(processCourse);
}

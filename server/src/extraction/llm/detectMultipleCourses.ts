import {
  ChatCompletionContentPart,
  ChatCompletionMessageParam,
} from "openai/resources/chat/completions";
import { DefaultLlmPageOptions } from ".";
import { assertBool, simpleToolCompletion } from "../../openai";

export async function detectMultipleCourses(options: DefaultLlmPageOptions) {
  const prompt = `
This is a page that we extracted from a university website.

It is either a course detail page (containing description and details for a single course)
or a course list page (containing a list of courses, possibly with their details and descriptions).

Your goal is to detect which one of the above is right, that is
whether this page contains a single course or multiple courses.

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
    toolName: "detect_multiple_courses",
    parameters: {
      multiple_courses: {
        type: "boolean",
      },
    },
    requiredParameters: ["multiple_courses"],
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
  const multipleCourses = assertBool(result.toolCallArgs, "multiple_courses");
  return multipleCourses;
}

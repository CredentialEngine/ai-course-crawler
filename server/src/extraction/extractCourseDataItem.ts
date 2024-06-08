import { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import { assertNumber, assertString, simpleToolCompletion } from "../openai";
import { simplifyHtml, toMarkdown } from "./browser";

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
Course credits (min): min credit hours
Course credits (max): max credit hours. If there is only a single credit information in the page, set it as the max.

PAGE URL:

${url}

SIMPLIFIED PAGE CONTENT:

${content}
`;

  const messages: ChatCompletionMessageParam[] = [
    {
      role: "user",
      content: [
        {
          type: "text",
          text: prompt,
        },
        {
          type: "image_url",
          image_url: { url: `data:image/webp;base64,${screenshot}` },
        },
      ],
    },
  ];
  const completion = await simpleToolCompletion(
    messages,
    "submit_course_data",
    {
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
        type: "number",
      },
      course_credits_max: {
        type: "number",
      },
    }
  );
  if (!completion) {
    return null;
  }
  return {
    courseId: assertString(completion, "course_id"),
    courseName: assertString(completion, "course_name"),
    courseDescription: assertString(completion, "course_description"),
    courseCreditsMin: assertNumber(completion, "course_credits_min"),
    courseCreditsMax: assertNumber(completion, "course_credits_max"),
  };
}

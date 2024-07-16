import {
  ChatCompletionContentPart,
  ChatCompletionMessageParam,
} from "openai/resources/chat/completions";
import { PAGE_DATA_TYPE } from "../data/schema";
import { assertBool, assertNumber, simpleToolCompletion } from "../openai";
import { simplifyHtml, toMarkdown } from "./browser";

const pageTypeDescriptions = {
  [PAGE_DATA_TYPE.COURSE_LINKS_PAGE]:
    "It has links to ALL the courses for an institution. Pagination is for pages of links to courses.",
  [PAGE_DATA_TYPE.CATEGORY_LINKS_PAGE]:
    "It has links to program or degree pages that presumably have links/descriptions for the courses. " +
    "Those links are presumably extensive for ALL the programs/degrees in the institution." +
    "Pagination is for pages of program/degree links.",
  [PAGE_DATA_TYPE.COURSE_DETAIL_PAGE]:
    "It has names/descriptions for ALL the courses for an instution. " +
    "Pagination is for pages of course descriptions.",
};

export async function detectPageCount(
  html: string,
  urlPattern: string,
  urlPatternType: string,
  screenshot?: string
) {
  const content = await toMarkdown(await simplifyHtml(html));
  const prompt = `
You are being given information about a web page that has paginated links in its content.
Your goal is to determine total number of pages, IF that information can be inferred from the page.
If you disagree the content has pagination, or if you can't determine the page count, use the
tool accordingly.

DETECTED PAGINATION PATTERN: ${urlPattern}

DETECTED PATTERN TYPE: ${urlPatternType}

WEBSITE CONTENT:

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
  const toolCall = await simpleToolCompletion(
    messages,
    "submit_detected_page_count",
    {
      detected_pagination: {
        type: "boolean",
      },
      detected_page_count: {
        type: "boolean",
      },
      total_pages: {
        type: "number",
      },
    }
  );
  if (!toolCall) {
    return undefined;
  }
  const hasPagination = assertBool(toolCall, "detected_pagination");
  const hasPageCount = assertBool(toolCall, "detected_page_count");

  if (!hasPagination || !hasPageCount) {
    return undefined;
  }

  const totalPages = assertNumber(toolCall, "total_pages");
  return {
    totalPages,
  };
}

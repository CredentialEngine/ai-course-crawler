import {
  ChatCompletionContentPart,
  ChatCompletionMessageParam,
} from "openai/resources/chat/completions";
import { assertBool, assertNumber, simpleToolCompletion } from "../../openai";
import { simplifyHtml, toMarkdown } from "../browser";

export interface ExtraOptions {
  screenshot?: string;
  logApiCalls?: {
    extractionId: number;
  };
}

export async function detectPageCount(
  html: string,
  urlPattern: string,
  urlPatternType: string,
  extraOptions?: ExtraOptions
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

  if (extraOptions?.screenshot) {
    completionContent.push({
      type: "image_url",
      image_url: { url: `data:image/webp;base64,${extraOptions.screenshot}` },
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
    toolName: "submit_detected_page_count",
    parameters: {
      detected_pagination: {
        type: "boolean",
      },
      detected_page_count: {
        type: "boolean",
      },
      total_pages: {
        type: "number",
      },
    },
    logApiCall: extraOptions?.logApiCalls
      ? {
          callSite: "detectPageCount",
          extractionId: extraOptions.logApiCalls.extractionId,
        }
      : undefined,
  });

  if (!result.toolCallArgs) {
    return undefined;
  }
  const toolCall = result.toolCallArgs;
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

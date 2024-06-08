import { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import { PAGE_DATA_TYPE } from "../data/schema";
import { assertStringEnum, simpleToolCompletion } from "../openai";
import { simplifyHtml, toMarkdown } from "./browser";

export async function detectCategoryPageType(
  url: string,
  html: string,
  screenshot: string
) {
  const content = await toMarkdown(await simplifyHtml(html));
  const prompt = `
The following page was identified as a category page for a certain kind of content.
Your goal is to identify the PRIMARY content type for the page.

The options are:

page_type A: Course links category. The page has *links* to the courses of an institution.
Typically, the course's code and title show up in the link.
Presumably, detailed information about the courses will be present in the destination links.

page_type B: Course details category.
It has *details* for the courses of an institution directly in the page.
Unlike A, pretty much all information about the courses is already in the page.
Information includes: identifier, description, credits, prerequisites.

page_type C: It has links to *subcategories, programs, careers or degrees* pages
(but not direct links to courses).
In other words, the page links to "subcategories" or further groupings of content,
and we'll find more detailed course information if we navigate to those category pages.

page_type D: Unknown/other. It doesn't match the descriptions above.

PAGE URL:

${url}

SIMPLIFIED PAGE CONTENT:

${content}
`;

  const contentTypes = ["A", "B", "C", "unknown"];
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
    "submit_detected_page_type",
    {
      page_type: {
        type: "string",
        enum: contentTypes,
      },
    }
  );
  if (!completion) {
    return null;
  }
  if (!completion.page_type) {
    return null;
  }
  const pageType = assertStringEnum(completion, "page_type", contentTypes);
  if (pageType === "unknown") {
    return null;
  }
  switch (pageType) {
    case "A":
      return PAGE_DATA_TYPE.COURSE_LINKS_PAGE;
    case "B":
      return PAGE_DATA_TYPE.COURSE_DETAIL_PAGE;
    case "C":
      return PAGE_DATA_TYPE.CATEGORY_PAGE;
    default:
      return null;
  }
}

import { PAGE_DATA_TYPE } from "../data/schema";
import { assertArray, simpleToolCompletion } from "../openai";
import { simplifyHtml, toMarkdown } from "./browser";

function resolveAbsoluteUrl(base: string, relative: string): string {
  const baseUrl = new URL(base);
  const absoluteUrl = new URL(relative, baseUrl);
  return absoluteUrl.href;
}

export default async function extractDetailUrls(
  url: string,
  html: string,
  screenshot: string,
  dataType: PAGE_DATA_TYPE.CATEGORY_PAGE | PAGE_DATA_TYPE.COURSE_LINKS_PAGE
) {
  const content = await toMarkdown(await simplifyHtml(html));
  const descriptions = {
    [PAGE_DATA_TYPE.CATEGORY_PAGE]: `
    Links to *programs, careers or degrees* pages (but not direct links to courses).
    In other words, the page links to "categories" or "groups" of courses, and we'll find more detailed course
    information if we navigate to those category pages`,

    [PAGE_DATA_TYPE.COURSE_LINKS_PAGE]: `
    COURSE DETAIL PAGES in an educational institution.
    Typically those links include the course identifier and/or description.
    Presumably, more information about the course will be in the destination link.
    `,
  };

  const prompt = `
    This page has a list of links to detail pages of a certain type.
    Your goal is to extract the URLs of those links.

    Sometimes the links are grouped in different sections. That's OK.
    Don't split the links between sections, don't ignore sections,
    just extract all the links from all the sections and give us those.

    You don't need to transform the URLs to make them absolute/relative.
    Just give us the URLs you find that match the request as you find them.

    Important: ONLY EXTRACT LINKS FOR THE TYPE WE ASK YOU TO!

    Description for the detail link type:

    ${descriptions[dataType]}

    The root page URL is: ${url}

    SIMPLIFIED PAGE CONTENT:
    ${content}
  `;

  const completion = await simpleToolCompletion(
    [
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
    ],
    "submit_urls",
    {
      urls: {
        type: "array",
        items: {
          type: "string",
        },
      },
    }
  );

  if (!completion) {
    return [];
  }
  if (!completion.urls) {
    return [];
  }

  const urls = assertArray<string>(completion, "urls");
  return urls.map((foundUrl) => resolveAbsoluteUrl(url, foundUrl));
}

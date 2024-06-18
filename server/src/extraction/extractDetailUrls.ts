import { PAGE_DATA_TYPE } from "../data/schema";
import { assertString, simpleToolCompletion } from "../openai";
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
  dataType: PAGE_DATA_TYPE
) {
  if (dataType == PAGE_DATA_TYPE.COURSE_DETAIL_PAGE) {
    throw new Error("Invalid page data type.");
  }

  const content = await toMarkdown(await simplifyHtml(html));
  const descriptions = {
    [PAGE_DATA_TYPE.CATEGORY_PAGE]: `
    Links to *programs, careers or degrees* pages (but not direct links to courses).
    In other words, the page links to "categories" or "groups" of courses, and we'll find more detailed course
    information if we navigate to those category pages.`,

    [PAGE_DATA_TYPE.COURSE_LINKS_PAGE]: `
    Course detail pages in an educational institution.
    Typically those links include the course identifier and/or description.
    Presumably, more information about the course will be in the destination link.
    `,
  };

  const prompt = `
    This Markdown document has a list of links to detail pages of a certain type:

    ${descriptions[dataType]}

    Your goal is to create a JS regexp for all the URLs of those links. We are going to use it like this:

    > const detailUrls = content.match(new RegExp(regexp, "g"));

    Important:
    - only extract links for the type we mentioned above.
    - do not attempt to transform links in any way.
    - do not add any extra characters to the links.
    - Again, to make it clear: we will run the regexp you give us as is. Any unnecessary modifications will make it fail!
    - Just give us the URLs exactly as they are in the content below.
    - Preserve the original pattern!!

    EXAMPLES:

    Content: [Course Page](course_page.php?id=1)
    Regexp: course_page\.php\?id=\d+

    Content: [Course Page](/course_page.php?id=1)
    Regexp: \/course_page\.php\?id=\d+

    Content: [Course Page](https://www.blablabla.com/course_page.php?id=1)
    Regexp: https:\/\/www.blablabla.com/course_page\.php\?id=\d+

    Content: [Course Page](www.blablabla.com/course_page.php?id=1)
    Regexp: www\.blablabla\.com\/course_page\.php\?id=\d+

    (maybe the regexps above aren't perfect but you get the picture, preserve the original pattern!!!!!)

    Now follows the actual content.

    CONTENT:

    ${content}
  `;

  console.log(prompt);

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
    "submit_regexp",
    {
      regexp: {
        type: "string",
      },
    }
  );

  if (!completion) {
    return null;
  }
  if (!completion.regexp) {
    return null;
  }

  let urlRegexp = assertString(completion, "regexp");
  console.log(`Raw regexp is ${urlRegexp}`);
  return {
    regexp: new RegExp(urlRegexp, "g"),
    extract: async (baseUrl: string, rawContent: string) => {
      const processedContent = await toMarkdown(await simplifyHtml(rawContent));
      const urls = processedContent.match(new RegExp(urlRegexp, "g")) || [];
      return urls.map((foundUrl) => {
        return resolveAbsoluteUrl(baseUrl, foundUrl);
      });
    },
  };
}

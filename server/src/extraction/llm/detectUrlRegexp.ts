import { ChatCompletionContentPart } from "openai/resources/chat/completions";
import { PageType } from "../../data/schema";
import { assertArray, assertString, simpleToolCompletion } from "../../openai";
import { resolveAbsoluteUrl } from "../../utils";
import { simplifyHtml, toMarkdown } from "../browser";

export function createUrlExtractor(regexp: RegExp) {
  return async (baseUrl: string, html: string) => {
    const processedContent = await toMarkdown(await simplifyHtml(html));
    const urls = processedContent.match(regexp) || [];
    return [
      ...new Set(
        urls.map((foundUrl) => {
          return resolveAbsoluteUrl(baseUrl, foundUrl);
        })
      ),
    ];
  };
}

export default async function detectUrlRegexp(
  dataType: PageType,
  html: string,
  screenshot?: string
) {
  if (dataType == PageType.COURSE_DETAIL_PAGE) {
    throw new Error("Invalid page data type.");
  }

  const content = await toMarkdown(await simplifyHtml(html));
  const descriptions = {
    [PageType.CATEGORY_LINKS_PAGE]: `
    Programs, careers, degrees, or course category pages.
    In other words, the page links to "categories" or "groups" of courses, and we'll find more detailed course
    information if we navigate to those category pages.
    `,

    [PageType.COURSE_LINKS_PAGE]: `
    Course detail pages in an educational institution.
    Typically those links include the course identifier and/or description.
    Presumably, more information about the course will be in the destination link.
    `,
  };

  const prompt = `
    This document has a list of links to detail pages of a certain type:

    ${descriptions[dataType]}

    Your goal is to create a JS regexp for all the URLs of those links.
    Go through the content carefully and think about a regexp that finds all the links
    with the type above.
    We are going to use it like this:

    > const detailUrls = content.match(new RegExp(regexp, "g"));

    Break down your reasoning for creating the regexp.

    IMPORTANT
    =========
    - only extract links for the type we mentioned above.
    - do not attempt to transform links in any way.
    - do not add any extra characters to the links.
    - we will run the regexp as you give it, on the content we gave you.
    - only submit one tool call with one regexp and total_links.
      There must be one regexp for all the links.
    - example_matches: some example matches that we should find when running your regexp. Max 5 examples.

    EXAMPLES
    ========
    Note that these are just examples!
    There will be different patterns and links in different pages.

    Content:
    [Course Page A](course_page.php?id=1)
    [Course Page B](course_page.php?id=2)
    [Course Page C](course_page.php?id=3)
    Regexp: course_page\.php\?id=\d+

    Content:
    [Course Page A](/course_page.php?id=1)
    [Course Page B](/course_page.php?id=2)
    [Course Page C](/course_page.php?id=3)
    Regexp: \/course_page\.php\?id=\d+

    Content:
    [Course Page A](https://www.blablabla.com/course_page.php?id=1)
    [Course Page B](https://www.blablabla.com/course_page.php?id=2)
    [Course Page C](https://www.blablabla.com/course_page.php?id=3)
    Regexp: https:\/\/www.blablabla.com/course_page\.php\?id=\d+

    Content:
    [Course Page A](www.blablabla.com/course_page.php?id=1)
    [Course Page B](www.blablabla.com/course_page.php?id=2)
    [Course Page C](www.blablabla.com/course_page.php?id=3)
    Regexp: www\.blablabla\.com\/course_page\.php\?id=\d+

    PAGE CONTENT
    ============

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

  const completion = await simpleToolCompletion(
    [
      {
        role: "user",
        content: completionContent,
      },
    ],
    "detail_link_regexp",
    {
      regexp: {
        type: "string",
      },
      example_matches: {
        type: "array",
        items: {
          type: "string",
        },
      },
    }
  );

  if (!completion) {
    throw new Error("Couldn't detect regexp");
  }

  let regexpStr = assertString(completion, "regexp");
  const exampleMatches = assertArray<string>(completion, "example_matches");
  console.log(`Raw regexp is ${regexpStr}`);
  console.log(`Example matches is ${exampleMatches}`);
  const regexp = new RegExp(regexpStr, "g");

  const urls = content.match(regexp) || [];
  if (!exampleMatches.every((u) => urls.find((u2) => u2 == u))) {
    throw new Error("Could not find every example");
  }
  return regexp;
}

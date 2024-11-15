import { describe, test } from "vitest";
import { assertConfiguration, RECIPE_TIMEOUT } from "..";
import { PageType } from "../../src/data/schema";

describe("Courseleaf", { timeout: RECIPE_TIMEOUT }, () => {
  test("University of Pennsylvania", async () => {
    await assertConfiguration("https://catalog.upenn.edu/courses/", {
      links: {
        pageType: PageType.COURSE_DETAIL_PAGE,
      },
      pageType: PageType.CATEGORY_LINKS_PAGE,
      sampleLinks: ["/courses/acct/", "/courses/hist/", "/courses/punj/"],
    });
  });

  test("Texas A&M International University", async () => {
    await assertConfiguration(
      "https://catalog.tamiu.edu/course-descriptions/",
      {
        links: {
          pageType: PageType.COURSE_DETAIL_PAGE,
        },
        pageType: PageType.CATEGORY_LINKS_PAGE,
        sampleLinks: [
          "/course-descriptions/port/",
          "/course-descriptions/ms/",
          "/course-descriptions/sost/",
        ],
      }
    );
  });
});

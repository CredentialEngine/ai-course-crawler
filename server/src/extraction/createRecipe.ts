import { startRecipe } from "../data/recipes";
import { PageType } from "../data/schema";
import { bestOutOf } from "../utils";
import { Queues, submitJob } from "../workers";
import { fetchBrowserPage } from "./browser";
import { detectPageType } from "./llm/detectPageType";

export async function createRecipe(url: string, catalogueId: number) {
  console.log(`Fetching ${url}`);
  const { content, screenshot } = await fetchBrowserPage(url);
  console.log(`Downloaded ${url}.`);
  console.log(`Detecting page type`);
  let pageType = await bestOutOf(
    5,
    () => detectPageType(url, content, { screenshot }),
    (p) => p as string
  );
  console.log(`Detected page type: ${pageType}`);
  let message: string | null = null;
  if (!pageType) {
    message =
      "Page was not detected as a course catalogue index. Defaulting to home page type: course links.";
    pageType = PageType.COURSE_LINKS_PAGE;
  }
  console.log(`Creating recipe`);
  const result = await startRecipe(catalogueId, url, pageType);
  console.log(`Created recipe ${result.id}`);
  const id = result.id;
  await submitJob(
    Queues.DetectConfiguration,
    { recipeId: id },
    `detectConfiguration.${id}`
  );
  return {
    id,
    pageType,
    message,
  };
}

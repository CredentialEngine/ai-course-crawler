import { Recipe, RecipeConfiguration } from "@/utils";

export function displayRecipeDetails(recipe: Recipe) {
  let currentConfig: RecipeConfiguration = recipe.configuration!;
  let display = `${currentConfig.pageType} (${
    currentConfig.pagination ? "has pagination" : "no pagination"
  })`;

  while (currentConfig.links) {
    currentConfig = currentConfig.links;
    display = `${display} > ${currentConfig.pageType} (${
      currentConfig.pagination ? "has pagination" : "no pagination"
    })`;
  }

  return display;
}

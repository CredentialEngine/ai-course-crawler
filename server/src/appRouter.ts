import {
  CourseStructuredData,
  PAGE_DATA_TYPE,
  RecipeConfiguration,
} from "./data/schema";
import { router } from "./routers";
import { catalogueDataRouter } from "./routers/catalogueData";
import { cataloguesRouter } from "./routers/catalogues";
import { extractionsRouter } from "./routers/extractions";
import { recipesRouter } from "./routers/recipes";
import { settingsRouter } from "./routers/settings";
import { usersRouter } from "./routers/users";
import { DetectConfigurationProgress } from "./workers";

const appRouter = router({
  catalogues: cataloguesRouter,
  catalogueData: catalogueDataRouter,
  settings: settingsRouter,
  recipes: recipesRouter,
  extractions: extractionsRouter,
  users: usersRouter,
});

export { appRouter };

export type {
  CourseStructuredData,
  DetectConfigurationProgress,
  PAGE_DATA_TYPE,
  RecipeConfiguration,
};

export type AppRouter = typeof appRouter;

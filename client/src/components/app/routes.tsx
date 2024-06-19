import { Route, Switch } from "wouter";
import CatalogueDataList from "./catalogueData";
import CatalogueDataCourses from "./catalogueData/courses";
import CatalogueDataDetail from "./catalogueData/detail";
import { RedirectToCourses } from "./catalogueData/redirectToCourses";
import Catalogues from "./catalogues";
import CreateCatalogue from "./catalogues/create";
import CatalogueDetail from "./catalogues/detail";
import CatalogueCreateExtraction from "./catalogues/extract";
import Extractions from "./extractions";
import ExtractionDetail from "./extractions/detail";
import ExtractionStepDetail from "./extractions/step";
import ExtractionStepItemDetail from "./extractions/stepItem";
import Logout from "./logout";
import MyProfile from "./profile";
import CreateRecipe from "./recipes/create";
import EditRecipe from "./recipes/edit";
import Settings from "./settings";
import Users from "./users";
import CreateUser from "./users/create";
import DeleteUser from "./users/delete";
import ResetUserPassword from "./users/reset-password";
import Welcome from "./welcome";

export default function Routes() {
  return (
    <Switch>
      <Route path="/" component={Welcome} />
      <Route path="/catalogues" nest>
        <Route path="/" component={Catalogues} />
        <Route path="/new" component={CreateCatalogue} />
        <Switch>
          <Route path="/:catalogueId" component={CatalogueDetail} />
          <Route path="/:catalogueId/recipes/new" component={CreateRecipe} />
          <Route
            path="/:catalogueId/recipes/:recipeId"
            component={EditRecipe}
          />
          <Route
            path="/:catalogueId/extract/:recipeId?"
            component={CatalogueCreateExtraction}
          />
        </Switch>
      </Route>
      <Route path="/extractions" nest>
        <Route path="/" component={Extractions} />
        <Switch>
          <Route path="/:extractionId" component={ExtractionDetail} />
          <Route
            path="/:extractionId/steps/:stepId/items/:stepItemId"
            component={ExtractionStepItemDetail}
          />
          <Route
            path="/:extractionId/steps/:stepId"
            component={ExtractionStepDetail}
          />
        </Switch>
      </Route>
      <Route path="/data" nest>
        <Route path="/" component={CatalogueDataList} />
        <Switch>
          <Route
            path="/catalogue/:catalogueId"
            component={CatalogueDataDetail}
          />
          <Route
            path="/courses/:catalogueDataId"
            component={CatalogueDataCourses}
          />
          <Route
            path="/extraction/:extractionId"
            component={RedirectToCourses}
          />
        </Switch>
      </Route>
      <Route path="/users" nest>
        <Route path="/" component={Users} />
        <Route path="/new" component={CreateUser} />
        <Switch>
          <Route path="/:userId/reset-password" component={ResetUserPassword} />
          <Route path="/:userId/delete" component={DeleteUser} />
        </Switch>
      </Route>
      <Route path="/profile" component={MyProfile} />
      <Route path="/settings*" component={Settings} />
      <Route path="/logout" component={Logout} />
    </Switch>
  );
}

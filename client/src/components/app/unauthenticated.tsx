import { Redirect, Route, Switch } from "wouter";
import Login from "./login";
import Logout from "./logout";

export default function Unauthenticated() {
  return (
    <div className="w-full h-dvh flex items-center justify-center">
      <Switch>
        <Route path="/" component={Login} />
        <Route path="/logout" component={Logout} />
        <Route>
          <Redirect to="/" />
        </Route>
      </Switch>
    </div>
  );
}

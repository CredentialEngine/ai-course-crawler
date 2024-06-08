import { createContext } from "react";

const UserContext = createContext<{
  user: any;
  setUser: React.Dispatch<any>;
}>({ user: null, setUser: () => {} });

export default UserContext;

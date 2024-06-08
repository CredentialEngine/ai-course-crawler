import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink } from "@trpc/client";
import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom/client";
import { Dashboard } from "./components/app/dashboard";
import Unauthenticated from "./components/app/unauthenticated";
import { API_URL } from "./constants";
import "./main.css";
import UserContext from "./userContext";
import { trpc } from "./utils";

const queryClient = new QueryClient();
const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      fetch(url, options) {
        return fetch(url, {
          ...options,
          credentials: "include",
        });
      },
      url: `${API_URL}/trpc`,
    }),
  ],
});

export function App() {
  const [user, setUser] = useState();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    fetch(`${API_URL}/me`, { credentials: "include" })
      .then((r) => {
        if (r.status != 200) {
          throw new Error("Not authorized");
        }
        return r.json();
      })
      .then(setUser)
      .then(() => setIsLoading(false))
      .catch(() => {
        setIsLoading(false);
      });
  }, []);

  if (isLoading) {
    return null;
  }

  return (
    <React.StrictMode>
      <UserContext.Provider value={{ user, setUser }}>
        <trpc.Provider client={trpcClient} queryClient={queryClient}>
          <QueryClientProvider client={queryClient}>
            {user ? <Dashboard /> : <Unauthenticated />}
          </QueryClientProvider>
        </trpc.Provider>
      </UserContext.Provider>
    </React.StrictMode>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(<App />);

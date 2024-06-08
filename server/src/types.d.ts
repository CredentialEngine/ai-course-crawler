import "@fastify/secure-session";
import { type InferSelectModel } from "drizzle-orm";
import "fastify";
import { users } from "./data/schema";

type User = Omit<InferSelectModel<typeof users>, "password">;

declare module "fastify" {
  interface FastifyRequest {
    user: User | undefined;
    isAuthenticated: () => boolean;
    logIn: (user: User) => void;
    logOut: () => void;
  }
}

declare module "@fastify/secure-session" {
  interface SessionData {
    userId: string | undefined;
  }
}

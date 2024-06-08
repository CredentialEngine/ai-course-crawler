import { CreateFastifyContextOptions } from "@trpc/server/adapters/fastify";
export function createContext({ req, res }: CreateFastifyContextOptions) {
  const user = (req as any).user;
  return { req, res, user };
}
export type Context = Awaited<ReturnType<typeof createContext>>;

import cors from "@fastify/cors";
import fastifySecureSession from "@fastify/secure-session";
import fastifyStatic from "@fastify/static";
import {
  fastifyTRPCPlugin,
  FastifyTRPCPluginOptions,
} from "@trpc/server/adapters/fastify";
import argon2 from "argon2";
import "dotenv/config";
import fastify from "fastify";
import { z } from "zod";
import { appRouter, type AppRouter } from "./appRouter";
import { streamCsv } from "./csv";
import { findExtractionById } from "./data/extractions";
import { findUserByEmail } from "./data/users";
import fastifySessionAuth, {
  requireAuthentication,
} from "./fastifySessionAuth";
import { createContext } from "./trpcContext";

const server = fastify();

const CLIENT_PATH = process.env.CLIENT_PATH;

if (CLIENT_PATH) {
  server.register(fastifyStatic, {
    root: CLIENT_PATH,
  });
  const spaRoutes = [
    "/catalogues",
    "/extractions",
    "/data",
    "/users",
    "/profile",
    "/settings",
    "/logout",
  ];
  server.setNotFoundHandler((req, res) => {
    if (spaRoutes.some((prefix) => req.url.startsWith(prefix))) {
      res.status(200).sendFile("index.html", CLIENT_PATH);
    } else {
      res.status(404).send();
    }
  });
}

server.register(cors, {
  origin: [process.env.FRONTEND_URL!],
  credentials: true,
  exposedHeaders: ["Content-Disposition", "Content-Type"],
});

server.register(fastifySecureSession, {
  key: Buffer.from(process.env.COOKIE_KEY as string, "hex"),
  cookie: {
    path: "/",
  },
});

server.register(fastifySessionAuth);

server.register(async (instance) => {
  instance.addHook("preHandler", requireAuthentication);

  instance.register(fastifyTRPCPlugin, {
    prefix: "/trpc",
    trpcOptions: {
      router: appRouter,
      createContext,
      onError(opts) {
        console.log(opts.error);
      },
    } satisfies FastifyTRPCPluginOptions<AppRouter>["trpcOptions"],
  });

  instance.get("/me", async (req, rep) => {
    rep.send(req.user);
  });

  instance.post("/logout", async (req, rep) => {
    req.logOut();
  });

  instance.get(
    "/downloads/courses/bulk_upload_template/:extractionId",
    async (request, reply) => {
      const { extractionId } = request.params as any;
      const extraction = await findExtractionById(extractionId);
      if (!extraction) {
        return reply.code(404).send({ error: "Extraction not found" });
      }
      const cataloguePiece = extraction.recipe.catalogue.name
        .replace(/[^a-zA-Z0-9]/g, "_")
        .replace(/_+/g, "_")
        .replace(/^_|_$/g, "")
        .substring(0, 50);
      const filename = `AICourseCrawl-BulkUploadTemplate-${extraction.id}_${cataloguePiece}.csv`;

      return reply
        .headers({
          "Content-Type": "application/octet-stream",
          "Content-Disposition": `attachment; filename="${filename}"`,
        })
        .send(streamCsv(extractionId));
    }
  );
});

server.get("/up", async (request, reply) => {
  return reply.send();
});

export interface LoginParams {
  email: string;
  password: string;
}

const LoginSchema = z.object({
  email: z.string().email().min(3).max(400),
  password: z.string().min(6).max(400),
});

server.post("/login", async (req, rep) => {
  try {
    LoginSchema.parse(req.body);
  } catch (err) {
    return rep.code(400).send(err);
  }
  const { email, password } = req.body as z.infer<typeof LoginSchema>;

  const user = await findUserByEmail(email, true);
  if (!user) {
    return rep
      .code(422)
      .send({ error: "Could not authenticate with email and password" });
  }

  const passwordMatches = await argon2.verify(user.password, password);
  if (!passwordMatches) {
    return rep
      .code(422)
      .send({ error: "Could not authenticate with email and password" });
  }

  const userOmittedPassword = { ...user, password: undefined };
  req.logIn(userOmittedPassword);
  rep.send(userOmittedPassword);
});

server.listen({ port: 3000, host: "0.0.0.0" }, (err, address) => {
  if (err) {
    console.error(err);
    process.exit(1);
  }
  console.log(`Server is running on ${address}`);
});

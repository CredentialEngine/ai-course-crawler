import cors from "@fastify/cors";
import fastifySecureSession from "@fastify/secure-session";
import fastifyStatic from "@fastify/static";
import {
  fastifyTRPCPlugin,
  FastifyTRPCPluginOptions,
} from "@trpc/server/adapters/fastify";
import argon2 from "argon2";
import "dotenv/config";
import { on } from "events";
import * as csv from "fast-csv";
import fastify from "fastify";
import { FastifySSEPlugin } from "fastify-sse-v2";
import { Stream } from "stream";
import { z } from "zod";
import { appRouter, CourseStructuredData, type AppRouter } from "./appRouter";
import { findAllDataItems } from "./data/catalogueData";
import { findUserByEmail } from "./data/users";
import fastifySessionAuth, {
  requireAuthentication,
} from "./fastifySessionAuth";
import {
  DetectConfigurationProgress,
  ExtractCourseCatalogueProgress,
  Queues,
} from "./jobs";
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
  origin: ["http://localhost:5173"],
  credentials: true,
});

server.register(FastifySSEPlugin);

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
        console.log(opts);
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
    "/downloads/courses/bulk_upload_template/:catalogueDataId",
    async (request, reply) => {
      const { catalogueDataId } = request.params as any;
      const dataItems = await findAllDataItems(catalogueDataId);
      const csvStream = csv.format({ headers: false });
      const outputStream = new Stream.PassThrough();
      csvStream.pipe(outputStream);
      csvStream.write([
        "External Identifier",
        "Learning Type",
        "Learning Opportunity Name",
        "Description",
        "Subject Webpage",
        "Life Cycle Status Type",
        "Language",
        "Available Online At",
        "Credits (Min)",
        "Credits (Max)",
        "Prerequisites",
      ]);
      for (const item of dataItems) {
        if (!item.structuredData) {
          continue;
        }
        const structuredData = item.structuredData as CourseStructuredData;
        csvStream.write([
          structuredData.courseId,
          "Course",
          structuredData.courseName,
          structuredData.courseDescription,
          item.extractionStepItem!.url,
          "Active",
          "English",
          item.extractionStepItem!.url,
          structuredData.courseCreditsMin,
          structuredData.courseCreditsMax,
          "",
        ]);
      }

      csvStream.end();

      return reply
        .header("Content-Type", "text/csv")
        .header(
          "Content-Disposition",
          `attachment; filename="AICourseMapping-BulkUploadTemplate-${catalogueDataId}.csv"`
        )
        .send(outputStream);
    }
  );

  instance.get(
    "/sse/recipes/configuration/:recipeId",
    async (request, reply) => {
      reply.sse(
        (async function* () {
          for await (const eventData of on(
            Queues.DetectConfiguration,
            "job progress"
          )) {
            const progress: DetectConfigurationProgress = eventData[1];
            let urlId: string | undefined = (request.params as any)?.recipeId;
            if (progress.recordId.toString() != urlId) {
              return;
            }
            yield {
              data: JSON.stringify(progress),
            };
          }
        })()
      );
    }
  );

  instance.get(
    "/sse/recipes/extractions/:extractionId",
    async (request, reply) => {
      reply.sse(
        (async function* () {
          for await (const eventData of on(
            Queues.ExtractCourseCatalogue,
            "job progress"
          )) {
            const progress: ExtractCourseCatalogueProgress = eventData[1];
            let urlId: string | undefined = (request.params as any)
              ?.extractionId;
            if (progress.recordId.toString() != urlId) {
              return;
            }
            yield {
              data: JSON.stringify(progress),
            };
          }
        })()
      );
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

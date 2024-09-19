import fastifyPlugin from "fastify-plugin";

import * as Airbrake from "@airbrake/node";

export const makeAirbrakePlugin = (airbrake: Airbrake.Notifier) =>
  fastifyPlugin(function (fastify, opts, done) {
    fastify.decorateReply("airbrakeMetric", null);

    fastify.addHook("onRequest", async (request, reply) => {
      const route = request.routeOptions.url ?? "UNKNOWN";
      reply.airbrakeMetric = airbrake.routes.start(request.method, route);
    });

    fastify.addHook("onResponse", async (request, reply) => {
      const metric = reply.airbrakeMetric;
      if (!metric) {
        return;
      }

      metric.route = request.routeOptions.url ?? "UNKNOWN";
      metric.statusCode = reply.statusCode;
      metric.contentType = reply.getHeader("Content-Type") as string;
      airbrake.routes.notify(metric);
    });

    fastify.setErrorHandler((error, request, reply) => {
      const url = `${request.protocol}://${request.headers.host}${request.url}`;
      const notice: any = {
        error,
        context: {
          userAddr: request.ip,
          userAgent: request.headers["user-agent"],
          url,
          httpMethod: request.method,
          component: "fastify",
          route: request.routeOptions.url,
        },
      };

      const referer = request.headers.referer;
      if (referer) {
        notice.context.referer = referer;
      }

      airbrake.notify(notice);
      reply.status(500).send(error);
    });

    done();
  });

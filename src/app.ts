import Fastify from "fastify";
import cors from "@fastify/cors";
import sensible from "@fastify/sensible";
import { env } from "./config/env.js";
import { errorHandler } from "./plugins/error-handler.js";
import { authPlugin } from "./plugins/auth.js";
import { rateLimitPlugin } from "./plugins/rate-limit.js";
import { healthRoutes } from "./routes/health.js";
import { inboxRoutes } from "./routes/inboxes/index.js";
import { messageRoutes, inboxMessageRoutes } from "./routes/messages/index.js";
import { threadRoutes, inboxThreadRoutes } from "./routes/threads/index.js";
import { webhookRoutes } from "./routes/webhooks/index.js";

export async function buildApp() {
  const config = env();

  const app = Fastify({
    logger: {
      level: config.LOG_LEVEL,
      ...(config.NODE_ENV === "development" && {
        transport: { target: "pino-pretty" },
      }),
    },
  });

  await app.register(cors);
  await app.register(sensible);
  await app.register(errorHandler);
  await app.register(rateLimitPlugin);
  await app.register(authPlugin);
  await app.register(healthRoutes);
  await app.register(inboxRoutes, { prefix: "/inboxes" });
  await app.register(inboxMessageRoutes, { prefix: "/inboxes" });
  await app.register(inboxThreadRoutes, { prefix: "/inboxes" });
  await app.register(messageRoutes, { prefix: "/messages" });
  await app.register(threadRoutes, { prefix: "/threads" });
  await app.register(webhookRoutes, { prefix: "/webhooks" });

  return app;
}

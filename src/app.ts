import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import Fastify from "fastify";
import cors from "@fastify/cors";
import multipart from "@fastify/multipart";
import sensible from "@fastify/sensible";
import fastifyStatic from "@fastify/static";
import fastifySwagger from "@fastify/swagger";
import fastifySwaggerUi from "@fastify/swagger-ui";
import yaml from "js-yaml";
import { env } from "./config/env.js";
import { errorHandler } from "./plugins/error-handler.js";
import { authPlugin } from "./plugins/auth.js";
import { rateLimitPlugin } from "./plugins/rate-limit.js";
import { healthRoutes } from "./routes/health.js";
import { inboxRoutes } from "./routes/inboxes/index.js";
import { messageRoutes, inboxMessageRoutes } from "./routes/messages/index.js";
import { threadRoutes, inboxThreadRoutes } from "./routes/threads/index.js";
import { webhookRoutes } from "./routes/webhooks/index.js";
import { snsRoutes } from "./routes/sns/index.js";
import { domainRoutes } from "./routes/domains/index.js";
import { attachmentRoutes } from "./routes/attachments/index.js";
import { landingRoute } from "./routes/landing.js";
import { authRoutes } from "./routes/auth/index.js";
import { accountRoutes } from "./routes/account/index.js";
import { skillRoute } from "./routes/skill.js";
import { dashboardRoute } from "./routes/dashboard.js";
import { blogRoute } from "./routes/blog.js";

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

  // Load OpenAPI spec
  const __dirname = dirname(fileURLToPath(import.meta.url));
  const specPath = join(__dirname, "..", "docs", "openapi.yaml");
  let spec: Record<string, unknown> = {};
  try {
    spec = yaml.load(readFileSync(specPath, "utf8")) as Record<string, unknown>;
  } catch {
    console.warn("OpenAPI spec not found, swagger docs will be empty");
  }

  await app.register(cors);
  await app.register(multipart, { limits: { fileSize: config.MAX_ATTACHMENT_SIZE_BYTES } });
  await app.register(sensible);

  // Swagger
  await app.register(fastifySwagger, {
    mode: "static",
    specification: { document: spec as any },
  });
  await app.register(fastifySwaggerUi, {
    routePrefix: "/docs",
    uiConfig: { docExpansion: "list", deepLinking: true },
  });

  // Static files
  await app.register(fastifyStatic, {
    root: join(__dirname, "..", "public"),
    prefix: "/public/",
    decorateReply: false,
  });

  // These must run on the root instance so their hooks/decorators apply to
  // every route instead of being trapped inside an encapsulated child scope.
  await errorHandler(app);
  await rateLimitPlugin(app);
  await authPlugin(app);
  await app.register(landingRoute);
  await app.register(skillRoute);
  await app.register(dashboardRoute);
  await app.register(blogRoute);
  await app.register(authRoutes, { prefix: "/auth" });
  await app.register(healthRoutes);
  await app.register(inboxRoutes, { prefix: "/inboxes" });
  await app.register(inboxMessageRoutes, { prefix: "/inboxes" });
  await app.register(inboxThreadRoutes, { prefix: "/inboxes" });
  await app.register(messageRoutes, { prefix: "/messages" });
  await app.register(threadRoutes, { prefix: "/threads" });
  await app.register(webhookRoutes, { prefix: "/webhooks" });
  await app.register(snsRoutes, { prefix: "/webhooks/sns" });
  await app.register(domainRoutes, { prefix: "/domains" });
  await app.register(attachmentRoutes, { prefix: "/attachments" });
  await app.register(accountRoutes, { prefix: "/account" });

  return app;
}

import type { FastifyInstance } from "fastify";
import * as handlers from "./handlers.js";

// Top-level thread routes: /threads/:id, /threads/:id/messages
export async function threadRoutes(app: FastifyInstance) {
  app.get("/:id", handlers.getThread);
  app.get("/:id/messages", handlers.getThreadMessages);
}

// Inbox-scoped: /inboxes/:id/threads
export async function inboxThreadRoutes(app: FastifyInstance) {
  app.get("/:id/threads", handlers.listThreads);
}

import type { FastifyInstance } from "fastify";
import * as handlers from "./handlers.js";

export async function messageRoutes(app: FastifyInstance) {
  // Message-by-id routes (GET /messages/:id, DELETE /messages/:id)
  app.get("/:id", handlers.getMessage);
  app.delete("/:id", handlers.deleteMessage);
}

// Inbox-scoped message routes registered separately
export async function inboxMessageRoutes(app: FastifyInstance) {
  // POST /inboxes/:inboxId/messages — send email
  app.post("/:inboxId/messages", handlers.sendMessage);
  // GET /inboxes/:inboxId/messages — list messages
  app.get("/:inboxId/messages", handlers.listMessages);
}

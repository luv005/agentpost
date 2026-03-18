import type { FastifyInstance } from "fastify";
import * as handlers from "./handlers.js";

export async function inboxRoutes(app: FastifyInstance) {
  app.post("/", handlers.createInbox);
  app.get("/", handlers.listInboxes);
  app.get("/:id", handlers.getInbox);
  app.delete("/:id", handlers.deleteInbox);
}

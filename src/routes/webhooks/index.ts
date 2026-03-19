import type { FastifyInstance } from "fastify";
import * as handlers from "./handlers.js";

export async function webhookRoutes(app: FastifyInstance) {
  app.post("/", handlers.createWebhook);
  app.get("/", handlers.listWebhooks);
  app.get("/:id", handlers.getWebhook);
  app.put("/:id", handlers.updateWebhook);
  app.delete("/:id", handlers.deleteWebhook);
}

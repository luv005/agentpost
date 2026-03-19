import type { FastifyInstance } from "fastify";
import * as handlers from "./handlers.js";

export async function attachmentRoutes(app: FastifyInstance) {
  app.post("/", handlers.uploadAttachment);
  app.get("/:id", handlers.downloadAttachment);
}

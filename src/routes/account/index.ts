import type { FastifyInstance } from "fastify";
import * as handlers from "./handlers.js";

export async function accountRoutes(app: FastifyInstance) {
  app.get("/", handlers.getAccount);
  app.post("/api-keys", handlers.createKey);
  app.get("/api-keys", handlers.listKeys);
  app.delete("/api-keys/:id", handlers.deleteKey);
}

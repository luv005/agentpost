import type { FastifyInstance } from "fastify";
import * as handlers from "./handlers.js";

export async function snsRoutes(app: FastifyInstance) {
  app.post("/", handlers.handleSnsNotification);
}

import type { FastifyInstance } from "fastify";
import * as handlers from "./handlers.js";

export async function domainRoutes(app: FastifyInstance) {
  app.post("/", handlers.addDomain);
  app.get("/", handlers.listDomains);
  app.get("/:id", handlers.getDomain);
  app.post("/:id/verify", handlers.verifyDomain);
  app.delete("/:id", handlers.deleteDomain);
}

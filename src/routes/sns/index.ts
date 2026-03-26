import type { FastifyInstance } from "fastify";
import * as handlers from "./handlers.js";

export async function snsRoutes(app: FastifyInstance) {
  // AWS SNS sends requests with Content-Type: text/plain, so we need
  // a custom parser to handle the JSON body properly.
  app.addContentTypeParser(
    "text/plain",
    { parseAs: "string" },
    (_req, body, done) => {
      try {
        done(null, JSON.parse(body as string));
      } catch (err) {
        done(err as Error, undefined);
      }
    },
  );

  app.post("/", handlers.handleSnsNotification);
}

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import type { FastifyInstance } from "fastify";

const __dirname = dirname(fileURLToPath(import.meta.url));

export async function landingRoute(app: FastifyInstance) {
  app.get("/", async (_request, reply) => {
    const html = readFileSync(
      join(__dirname, "..", "..", "public", "index.html"),
      "utf8",
    );
    return reply.type("text/html").send(html);
  });
}

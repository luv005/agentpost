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

  app.get("/robots.txt", async (_request, reply) => {
    const content = readFileSync(
      join(__dirname, "..", "..", "public", "robots.txt"),
      "utf8",
    );
    return reply.type("text/plain").send(content);
  });

  app.get("/sitemap.xml", async (_request, reply) => {
    const content = readFileSync(
      join(__dirname, "..", "..", "public", "sitemap.xml"),
      "utf8",
    );
    return reply.type("application/xml").send(content);
  });
}

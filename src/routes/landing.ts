import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import type { FastifyInstance } from "fastify";
import { env } from "../config/env.js";
import { generateSitemapXml } from "../lib/sitemap.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = join(__dirname, "..", "..", "public");
const LOCALES = ["ja", "ko", "es", "de", "el", "id", "vi", "fr", "ar", "zh", "zh-tw"];

export async function landingRoute(app: FastifyInstance) {
  const config = env();

  app.get("/", async (_request, reply) => {
    const html = readFileSync(join(PUBLIC_DIR, "index.html"), "utf8");
    return reply.type("text/html").send(html);
  });

  // Localized landing pages: /ja, /ko, /es, etc.
  app.get("/:locale", async (request, reply) => {
    const { locale } = request.params as { locale: string };
    if (!LOCALES.includes(locale)) {
      return reply.callNotFound();
    }
    const file = join(PUBLIC_DIR, locale, "index.html");
    if (!existsSync(file)) {
      return reply.redirect("/");
    }
    return reply.type("text/html").send(readFileSync(file, "utf8"));
  });

  app.get("/robots.txt", async (_request, reply) => {
    const content = readFileSync(
      join(__dirname, "..", "..", "public", "robots.txt"),
      "utf8",
    );
    return reply.type("text/plain").send(content);
  });

  app.get("/sitemap.xml", async (_request, reply) => {
    const content = generateSitemapXml({
      baseUrl: config.APP_URL,
      publicDir: join(__dirname, "..", "..", "public"),
    });
    return reply.type("application/xml").send(content);
  });
}

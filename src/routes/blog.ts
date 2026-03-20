import { readFileSync, existsSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { FastifyInstance } from "fastify";

const __dirname = dirname(fileURLToPath(import.meta.url));
const BLOG_DIR = resolve(join(__dirname, "..", "..", "public", "blog"));

export async function blogRoute(app: FastifyInstance) {
  // Blog index
  app.get("/blog", async (_request, reply) => {
    const file = join(BLOG_DIR, "index.html");
    if (!existsSync(file)) {
      return reply.code(404).send("Blog index not found");
    }
    return reply.type("text/html").send(readFileSync(file, "utf8"));
  });

  // Localized blog index: /blog/es, /blog/fr, etc.
  app.get("/blog/:locale", async (request, reply) => {
    const { locale } = request.params as { locale: string };
    // Check if locale is a known language code
    const locales = ["es", "fr", "de", "ja", "zh", "pt"];
    if (locales.includes(locale)) {
      const file = join(BLOG_DIR, locale, "index.html");
      if (existsSync(file)) {
        return reply.type("text/html").send(readFileSync(file, "utf8"));
      }
      // Fallback to main index
      return reply.redirect("/blog");
    }
    // Otherwise treat as a slug (English post)
    const file = join(BLOG_DIR, `${locale}.html`);
    if (!existsSync(file)) {
      return reply.code(404).send("Post not found");
    }
    return reply.type("text/html").send(readFileSync(file, "utf8"));
  });

  // Localized post: /blog/es/slug
  app.get("/blog/:locale/:slug", async (request, reply) => {
    const { locale, slug } = request.params as { locale: string; slug: string };
    const file = join(BLOG_DIR, locale, `${slug}.html`);
    if (!existsSync(file)) {
      // Fallback to English version
      const enFile = join(BLOG_DIR, `${slug}.html`);
      if (existsSync(enFile)) {
        return reply.type("text/html").send(readFileSync(enFile, "utf8"));
      }
      return reply.code(404).send("Post not found");
    }
    return reply.type("text/html").send(readFileSync(file, "utf8"));
  });
}

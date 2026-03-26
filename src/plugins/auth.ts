import type { FastifyInstance, FastifyRequest } from "fastify";
import { eq } from "drizzle-orm";
import { validateApiKey } from "../services/api-key.service.js";
import { verifyJwt } from "../services/auth.service.js";
import { getDb } from "../db/client.js";
import { accounts } from "../db/schema.js";
import { UnauthorizedError } from "../lib/errors.js";

function extractKey(request: FastifyRequest): string | null {
  const authHeader = request.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.slice(7);
  }

  const apiKeyHeader = request.headers["x-api-key"];
  if (typeof apiKeyHeader === "string") {
    return apiKeyHeader;
  }

  const cookieHeader = request.headers.cookie;
  if (cookieHeader) {
    const tokenCookie = cookieHeader
      .split(";")
      .map((cookie) => cookie.trim())
      .find((cookie) => cookie.startsWith("agentsend_token="));

    if (tokenCookie) {
      const [, value = ""] = tokenCookie.split("=", 2);
      if (value) return decodeURIComponent(value);
    }
  }

  return null;
}

const LANDING_LOCALES = new Set([
  "ja", "ko", "es", "de", "el", "id", "vi", "fr", "ar", "zh", "zh-tw", "pt", "th",
]);

function isPublicPath(url: string): boolean {
  const publicPrefixes = [
    "/health",
    "/webhooks/sns",
    "/docs",
    "/public",
    "/auth",
    "/skill",
    "/dashboard",
    "/blog",
  ];
  if (url === "/") return true;
  if (url === "/sitemap.xml" || url === "/sitemap.xsl" || url === "/robots.txt") return true;

  // Locale landing pages: /ja, /ko, /pt, etc.
  const bare = url.split("?")[0];
  if (bare && LANDING_LOCALES.has(bare.slice(1))) return true;

  return publicPrefixes.some(
    (p) => url === p || url.startsWith(p + "/") || url.startsWith(p + "?"),
  );
}

async function resolveAccountFromJwt(
  token: string,
): Promise<Record<string, unknown> | null> {
  const payload = verifyJwt(token);
  if (!payload) return null;

  const db = getDb();
  const [account] = await db
    .select({
      id: accounts.id,
      name: accounts.name,
      email: accounts.email,
      plan: accounts.plan,
      dailySendLimit: accounts.dailySendLimit,
      isVerified: accounts.isVerified,
    })
    .from(accounts)
    .where(eq(accounts.id, payload.sub))
    .limit(1);

  return account ?? null;
}

export async function authPlugin(app: FastifyInstance) {
  app.decorateRequest("account", null as any);

  app.addHook("onRequest", async (request, _reply) => {
    if (isPublicPath(request.url)) return;

    const rawKey = extractKey(request);
    if (!rawKey) throw new UnauthorizedError();

    // Try API key first (starts with "ask_")
    if (rawKey.startsWith("ask_")) {
      const account = await validateApiKey(rawKey);
      if (!account) throw new UnauthorizedError();
      request.account = account;
      return;
    }

    // Try JWT
    const account = await resolveAccountFromJwt(rawKey);
    if (!account) throw new UnauthorizedError();
    request.account = account as any;
  });
}

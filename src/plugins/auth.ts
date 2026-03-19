import type { FastifyInstance, FastifyRequest } from "fastify";
import { validateApiKey } from "../services/api-key.service.js";
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

  return null;
}

export async function authPlugin(app: FastifyInstance) {
  app.decorateRequest("account", null as any);

  app.addHook("onRequest", async (request, _reply) => {
    // Skip auth for health check
    if (request.url === "/health" || request.url.startsWith("/webhooks/sns")) return;

    const rawKey = extractKey(request);
    if (!rawKey) throw new UnauthorizedError();

    const account = await validateApiKey(rawKey);
    if (!account) throw new UnauthorizedError();

    request.account = account;
  });
}

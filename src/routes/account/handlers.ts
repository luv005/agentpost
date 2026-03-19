import type { FastifyRequest, FastifyReply } from "fastify";
import { eq, and, isNull } from "drizzle-orm";
import { getDb } from "../../db/client.js";
import { apiKeys } from "../../db/schema.js";
import { createApiKey, revokeApiKey } from "../../services/api-key.service.js";
import { createApiKeyBody, apiKeyIdParams } from "./schemas.js";

/**
 * GET /account — Get current account info
 */
export async function getAccount(request: FastifyRequest, reply: FastifyReply) {
  return reply.send(request.account);
}

/**
 * POST /account/api-keys — Create a new API key
 */
export async function createKey(request: FastifyRequest, reply: FastifyReply) {
  const body = createApiKeyBody.parse(request.body);
  const result = await createApiKey(request.account.id, body.name);
  return reply.status(201).send({
    id: result.id,
    key: result.key,
    prefix: result.prefix,
    name: result.name,
    message: "Store this key securely — it won't be shown again.",
  });
}

/**
 * GET /account/api-keys — List all API keys (without secrets)
 */
export async function listKeys(request: FastifyRequest, reply: FastifyReply) {
  const db = getDb();
  const keys = await db
    .select({
      id: apiKeys.id,
      keyPrefix: apiKeys.keyPrefix,
      name: apiKeys.name,
      lastUsedAt: apiKeys.lastUsedAt,
      expiresAt: apiKeys.expiresAt,
      createdAt: apiKeys.createdAt,
    })
    .from(apiKeys)
    .where(
      and(
        eq(apiKeys.accountId, request.account.id),
        isNull(apiKeys.revokedAt),
      ),
    );

  return reply.send({ data: keys });
}

/**
 * DELETE /account/api-keys/:id — Revoke an API key
 */
export async function deleteKey(request: FastifyRequest, reply: FastifyReply) {
  const { id } = apiKeyIdParams.parse(request.params);
  const result = await revokeApiKey(id, request.account.id);
  if (!result) {
    return reply.status(404).send({ error: "API key not found" });
  }
  return reply.status(204).send();
}

import { createHash } from "node:crypto";
import { eq, and, isNull } from "drizzle-orm";
import { getDb } from "../db/client.js";
import { apiKeys, accounts } from "../db/schema.js";
import { generateApiKey } from "../lib/id.js";

function hashKey(rawKey: string): string {
  return createHash("sha256").update(rawKey).digest("hex");
}

function extractPrefix(rawKey: string): string {
  return rawKey.slice(0, 12);
}

export async function createApiKey(accountId: string, name?: string) {
  const db = getDb();
  const rawKey = generateApiKey();
  const hash = hashKey(rawKey);
  const prefix = extractPrefix(rawKey);

  const [row] = await db
    .insert(apiKeys)
    .values({
      accountId,
      keyPrefix: prefix,
      keyHash: hash,
      name: name ?? null,
    })
    .returning();

  return { id: row.id, key: rawKey, prefix, name: row.name };
}

export async function validateApiKey(rawKey: string) {
  const db = getDb();
  const hash = hashKey(rawKey);

  const rows = await db
    .select({
      keyId: apiKeys.id,
      accountId: apiKeys.accountId,
      expiresAt: apiKeys.expiresAt,
      revokedAt: apiKeys.revokedAt,
      account: {
        id: accounts.id,
        name: accounts.name,
        email: accounts.email,
        plan: accounts.plan,
        dailySendLimit: accounts.dailySendLimit,
        isVerified: accounts.isVerified,
      },
    })
    .from(apiKeys)
    .innerJoin(accounts, eq(apiKeys.accountId, accounts.id))
    .where(eq(apiKeys.keyHash, hash))
    .limit(1);

  if (rows.length === 0) return null;

  const row = rows[0];

  // Check if revoked
  if (row.revokedAt) return null;

  // Check if expired
  if (row.expiresAt && row.expiresAt < new Date()) return null;

  // Update last_used_at (fire-and-forget)
  db.update(apiKeys)
    .set({ lastUsedAt: new Date() })
    .where(eq(apiKeys.id, row.keyId))
    .then(() => {});

  return row.account;
}

export async function revokeApiKey(keyId: string, accountId: string) {
  const db = getDb();
  const [row] = await db
    .update(apiKeys)
    .set({ revokedAt: new Date() })
    .where(and(eq(apiKeys.id, keyId), eq(apiKeys.accountId, accountId)))
    .returning();
  return row ?? null;
}

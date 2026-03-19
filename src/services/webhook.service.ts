import { createHmac, randomBytes } from "node:crypto";
import { eq, and } from "drizzle-orm";
import { getDb } from "../db/client.js";
import { webhooks } from "../db/schema.js";
import { enqueueWebhook } from "../queue/webhook.queue.js";
import { NotFoundError } from "../lib/errors.js";

export function generateWebhookSecret(): string {
  return `whsec_${randomBytes(24).toString("hex")}`;
}

export function signPayload(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("hex");
}

export async function createWebhook(
  accountId: string,
  url: string,
  events?: string[],
) {
  const db = getDb();
  const secret = generateWebhookSecret();

  const [webhook] = await db
    .insert(webhooks)
    .values({
      accountId,
      url,
      events: events ?? ["message.received"],
      secret,
    })
    .returning();

  return { ...webhook, secret };
}

export async function listWebhooks(accountId: string) {
  const db = getDb();
  return db
    .select({
      id: webhooks.id,
      url: webhooks.url,
      events: webhooks.events,
      isActive: webhooks.isActive,
      createdAt: webhooks.createdAt,
      updatedAt: webhooks.updatedAt,
    })
    .from(webhooks)
    .where(eq(webhooks.accountId, accountId));
}

export async function getWebhook(webhookId: string, accountId: string) {
  const db = getDb();
  const [webhook] = await db
    .select()
    .from(webhooks)
    .where(and(eq(webhooks.id, webhookId), eq(webhooks.accountId, accountId)))
    .limit(1);

  if (!webhook) throw new NotFoundError("Webhook", webhookId);
  return webhook;
}

export async function updateWebhook(
  webhookId: string,
  accountId: string,
  data: { url?: string; events?: string[]; isActive?: boolean },
) {
  const db = getDb();
  const [webhook] = await db
    .update(webhooks)
    .set({ ...data, updatedAt: new Date() })
    .where(and(eq(webhooks.id, webhookId), eq(webhooks.accountId, accountId)))
    .returning();

  if (!webhook) throw new NotFoundError("Webhook", webhookId);
  return webhook;
}

export async function deleteWebhook(webhookId: string, accountId: string) {
  const db = getDb();
  const [webhook] = await db
    .delete(webhooks)
    .where(and(eq(webhooks.id, webhookId), eq(webhooks.accountId, accountId)))
    .returning();

  if (!webhook) throw new NotFoundError("Webhook", webhookId);
  return webhook;
}

/**
 * Find all active webhooks for an account subscribed to this event,
 * and enqueue delivery for each.
 */
export async function deliverEvent(
  accountId: string,
  event: string,
  payload: Record<string, unknown>,
) {
  const db = getDb();

  const activeWebhooks = await db
    .select()
    .from(webhooks)
    .where(and(eq(webhooks.accountId, accountId), eq(webhooks.isActive, true)));

  for (const wh of activeWebhooks) {
    const events = wh.events as string[] | null;
    if (events && !events.includes(event)) continue;

    await enqueueWebhook({
      webhookId: wh.id,
      url: wh.url,
      secret: wh.secret,
      event,
      payload,
    });
  }
}

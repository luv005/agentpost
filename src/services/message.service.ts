import { eq, and, desc, sql } from "drizzle-orm";
import { getDb } from "../db/client.js";
import { messages } from "../db/schema.js";
import { getActiveInbox } from "./inbox.service.js";
import { enqueueEmail } from "../queue/email.queue.js";
import { RateLimitError, NotFoundError } from "../lib/errors.js";

export interface SendMessageInput {
  inboxId: string;
  accountId: string;
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  bodyText?: string;
  bodyHtml?: string;
}

export async function sendMessage(input: SendMessageInput) {
  const db = getDb();

  // Verify inbox is active and belongs to account
  const inbox = await getActiveInbox(input.inboxId, input.accountId);

  // Check per-inbox daily send limit
  if (inbox.sendsToday >= inbox.dailySendLimit) {
    throw new RateLimitError(
      `Inbox daily send limit reached (${inbox.dailySendLimit}/day). ${
        inbox.isVerified
          ? "Contact support to increase."
          : "Verify inbox to increase limit."
      }`,
    );
  }

  // Insert message with status 'queued'
  const [message] = await db
    .insert(messages)
    .values({
      inboxId: inbox.id,
      accountId: input.accountId,
      direction: "outbound",
      fromAddress: inbox.displayName
        ? `${inbox.displayName} <${inbox.address}>`
        : inbox.address,
      toAddresses: input.to,
      ccAddresses: input.cc ?? [],
      bccAddresses: input.bcc ?? [],
      subject: input.subject,
      bodyText: input.bodyText ?? null,
      bodyHtml: input.bodyHtml ?? null,
      status: "queued",
    })
    .returning();

  // Enqueue for async sending
  await enqueueEmail({
    messageId: message.id,
    from: inbox.displayName
      ? `${inbox.displayName} <${inbox.address}>`
      : inbox.address,
    to: input.to,
    cc: input.cc,
    bcc: input.bcc,
    subject: input.subject,
    bodyText: input.bodyText,
    bodyHtml: input.bodyHtml,
    inboxId: inbox.id,
  });

  return message;
}

export async function listMessages(
  inboxId: string,
  accountId: string,
  opts: { limit?: number; offset?: number; status?: string } = {},
) {
  const db = getDb();
  const limit = opts.limit ?? 20;
  const offset = opts.offset ?? 0;

  const conditions = [
    eq(messages.inboxId, inboxId),
    eq(messages.accountId, accountId),
  ];

  if (opts.status) {
    conditions.push(eq(messages.status, opts.status));
  }

  const rows = await db
    .select()
    .from(messages)
    .where(and(...conditions))
    .orderBy(desc(messages.createdAt))
    .limit(limit)
    .offset(offset);

  const [countResult] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(messages)
    .where(and(...conditions));

  return { data: rows, total: countResult.count };
}

export async function getMessage(messageId: string, accountId: string) {
  const db = getDb();

  const [message] = await db
    .select()
    .from(messages)
    .where(and(eq(messages.id, messageId), eq(messages.accountId, accountId)))
    .limit(1);

  if (!message) throw new NotFoundError("Message", messageId);
  return message;
}

export async function deleteMessage(messageId: string, accountId: string) {
  const db = getDb();

  const [message] = await db
    .delete(messages)
    .where(and(eq(messages.id, messageId), eq(messages.accountId, accountId)))
    .returning();

  if (!message) throw new NotFoundError("Message", messageId);
  return message;
}

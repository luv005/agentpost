import { eq, and, desc, sql } from "drizzle-orm";
import { getDb } from "../db/client.js";
import { messages } from "../db/schema.js";
import { getActiveInbox } from "./inbox.service.js";
import { enqueueEmail } from "../queue/email.queue.js";
import { resolveThread, updateThreadOnNewMessage } from "./thread.service.js";
import { generateMessageId } from "../lib/message-id.js";
import { getAttachmentsByIds } from "./attachment.service.js";
import { RateLimitError, NotFoundError, AppError } from "../lib/errors.js";
import type { MessageAttachment } from "../db/schema.js";

export interface SendMessageInput {
  inboxId: string;
  accountId: string;
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  bodyText?: string;
  bodyHtml?: string;
  threadId?: string;
  attachmentIds?: string[];
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

  // Generate RFC 5322 Message-ID
  const messageIdHeader = generateMessageId();

  // Build In-Reply-To and References if this is a thread reply
  let inReplyTo: string | null = null;
  let referencesHeaders: string[] = [];

  // Resolve or create thread
  const threadId = input.threadId
    ? input.threadId
    : await resolveThread(
        inbox.id,
        input.accountId,
        input.subject,
      );

  // If replying to existing thread, build reply headers from last message
  if (input.threadId) {
    const [lastMsg] = await db
      .select({
        messageIdHeader: messages.messageIdHeader,
        referencesHeaders: messages.referencesHeaders,
      })
      .from(messages)
      .where(eq(messages.threadId, input.threadId))
      .orderBy(desc(messages.createdAt))
      .limit(1);

    if (lastMsg?.messageIdHeader) {
      inReplyTo = lastMsg.messageIdHeader;
      const prevRefs = (lastMsg.referencesHeaders as string[]) ?? [];
      referencesHeaders = [...prevRefs, lastMsg.messageIdHeader];
    }
  }

  const fromAddress = inbox.displayName
    ? `${inbox.displayName} <${inbox.address}>`
    : inbox.address;

  // Fetch and validate attachments if provided
  let storedAttachments: MessageAttachment[] = [];
  let queueAttachments: { key: string; filename: string; contentType: string }[] = [];

  if (input.attachmentIds?.length) {
    const attachmentRecords = await getAttachmentsByIds(
      input.attachmentIds,
      input.accountId,
    );

    const totalSize = attachmentRecords.reduce((sum, a) => sum + a.size, 0);
    if (totalSize > 25 * 1024 * 1024) {
      throw new AppError(
        "ATTACHMENTS_TOO_LARGE",
        "Total attachment size exceeds 25MB limit",
        400,
      );
    }

    storedAttachments = attachmentRecords.map((a) => ({
      key: a.key,
      filename: a.filename,
      contentType: a.contentType,
      size: a.size,
    }));

    queueAttachments = attachmentRecords.map((a) => ({
      key: a.key,
      filename: a.filename,
      contentType: a.contentType,
    }));
  }

  // Insert message with status 'queued'
  const [message] = await db
    .insert(messages)
    .values({
      inboxId: inbox.id,
      accountId: input.accountId,
      threadId,
      direction: "outbound",
      fromAddress,
      toAddresses: input.to,
      ccAddresses: input.cc ?? [],
      bccAddresses: input.bcc ?? [],
      subject: input.subject,
      bodyText: input.bodyText ?? null,
      bodyHtml: input.bodyHtml ?? null,
      attachments: storedAttachments.length > 0 ? storedAttachments : [],
      status: "queued",
      messageIdHeader,
      inReplyTo,
      referencesHeaders,
    })
    .returning();

  // Update thread
  await updateThreadOnNewMessage(threadId);

  // Enqueue for async sending
  await enqueueEmail({
    messageId: message.id,
    messageIdHeader,
    inReplyTo: inReplyTo ?? undefined,
    references: referencesHeaders.length > 0 ? referencesHeaders : undefined,
    from: fromAddress,
    to: input.to,
    cc: input.cc,
    bcc: input.bcc,
    subject: input.subject,
    bodyText: input.bodyText,
    bodyHtml: input.bodyHtml,
    inboxId: inbox.id,
    attachments: queueAttachments.length > 0 ? queueAttachments : undefined,
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

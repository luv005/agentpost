import { eq, and, desc, sql, inArray } from "drizzle-orm";
import { getDb } from "../db/client.js";
import { threads, messages } from "../db/schema.js";
import { normalizeSubject } from "../lib/thread-subject.js";
import { NotFoundError } from "../lib/errors.js";

/**
 * Resolve a thread for a message. Walks the References/In-Reply-To chain
 * to find an existing thread, or creates a new one.
 */
export async function resolveThread(
  inboxId: string,
  accountId: string,
  subject: string,
  inReplyTo?: string | null,
  references?: string[] | null,
): Promise<string> {
  const db = getDb();

  // Build list of message-ids to search for (most recent first)
  const messageIds: string[] = [];
  if (inReplyTo) messageIds.push(inReplyTo);
  if (references?.length) {
    // References are ordered oldest-first per RFC; reverse for most-recent-first lookup
    for (const ref of [...references].reverse()) {
      if (!messageIds.includes(ref)) messageIds.push(ref);
    }
  }

  // Try to find an existing thread via the references chain
  if (messageIds.length > 0) {
    const matchedMessages = await db
      .select({ threadId: messages.threadId })
      .from(messages)
      .where(
        and(
          inArray(messages.messageIdHeader, messageIds),
          eq(messages.accountId, accountId),
        ),
      )
      .limit(1);

    if (matchedMessages.length > 0 && matchedMessages[0].threadId) {
      return matchedMessages[0].threadId;
    }
  }

  // No existing thread found — create a new one
  const [thread] = await db
    .insert(threads)
    .values({
      inboxId,
      accountId,
      subject: normalizeSubject(subject),
    })
    .returning();

  return thread.id;
}

/**
 * Update thread metadata after adding a message.
 */
export async function updateThreadOnNewMessage(threadId: string) {
  const db = getDb();
  await db
    .update(threads)
    .set({
      lastMessageAt: new Date(),
      messageCount: sql`${threads.messageCount} + 1`,
    })
    .where(eq(threads.id, threadId));
}

export async function getThread(threadId: string, accountId: string) {
  const db = getDb();
  const [thread] = await db
    .select()
    .from(threads)
    .where(and(eq(threads.id, threadId), eq(threads.accountId, accountId)))
    .limit(1);

  if (!thread) throw new NotFoundError("Thread", threadId);
  return thread;
}

export async function listThreads(
  inboxId: string,
  accountId: string,
  opts: { limit?: number; offset?: number } = {},
) {
  const db = getDb();
  const limit = opts.limit ?? 20;
  const offset = opts.offset ?? 0;

  const rows = await db
    .select()
    .from(threads)
    .where(
      and(eq(threads.inboxId, inboxId), eq(threads.accountId, accountId)),
    )
    .orderBy(desc(threads.lastMessageAt))
    .limit(limit)
    .offset(offset);

  const [countResult] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(threads)
    .where(
      and(eq(threads.inboxId, inboxId), eq(threads.accountId, accountId)),
    );

  return { data: rows, total: countResult.count };
}

export async function getThreadMessages(
  threadId: string,
  accountId: string,
  opts: { limit?: number; offset?: number } = {},
) {
  const db = getDb();
  const limit = opts.limit ?? 50;
  const offset = opts.offset ?? 0;

  // Verify thread belongs to account
  await getThread(threadId, accountId);

  const rows = await db
    .select()
    .from(messages)
    .where(and(eq(messages.threadId, threadId), eq(messages.accountId, accountId)))
    .orderBy(messages.createdAt)
    .limit(limit)
    .offset(offset);

  const [countResult] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(messages)
    .where(and(eq(messages.threadId, threadId), eq(messages.accountId, accountId)));

  return { data: rows, total: countResult.count };
}

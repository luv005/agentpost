import { Worker, Job } from "bullmq";
import { eq, and, isNull } from "drizzle-orm";
import { getRedisConnection } from "./connection.js";
import { getDb } from "../db/client.js";
import { inboxes, messages } from "../db/schema.js";
import { parseEmail } from "../smtp/parser.js";
import { resolveThread, updateThreadOnNewMessage } from "../services/thread.service.js";
import { uploadAttachment } from "../services/s3.service.js";
import { deliverEvent } from "../services/webhook.service.js";
import type { InboundJobData } from "./inbound.queue.js";
import type { MessageAttachment } from "../db/schema.js";
import { nanoid } from "nanoid";

async function processInboundJob(job: Job<InboundJobData>) {
  const db = getDb();
  const { rawEmail, recipientAddress } = job.data;

  // 1. Parse the email
  const parsed = await parseEmail(Buffer.from(rawEmail, "base64"));

  // 2. Look up inbox
  const [inbox] = await db
    .select()
    .from(inboxes)
    .where(
      and(
        eq(inboxes.address, recipientAddress),
        eq(inboxes.status, "active"),
        isNull(inboxes.deletedAt),
      ),
    )
    .limit(1);

  if (!inbox) {
    console.warn(`Inbox not found for ${recipientAddress}, skipping`);
    return;
  }

  // 3. Upload attachments to S3
  const storedAttachments: MessageAttachment[] = [];
  for (const att of parsed.attachments) {
    const key = `inbound/${inbox.id}/${nanoid(16)}/${att.filename}`;
    await uploadAttachment(key, att.content, att.contentType);
    storedAttachments.push({
      key,
      filename: att.filename,
      contentType: att.contentType,
      size: att.size,
    });
  }

  // 4. Resolve thread
  const threadId = await resolveThread(
    inbox.id,
    inbox.accountId,
    parsed.subject,
    parsed.inReplyTo,
    parsed.references,
  );

  // 5. Insert message
  const [message] = await db
    .insert(messages)
    .values({
      inboxId: inbox.id,
      accountId: inbox.accountId,
      threadId,
      direction: "inbound",
      fromAddress: parsed.from,
      toAddresses: parsed.to,
      ccAddresses: parsed.cc,
      subject: parsed.subject,
      bodyText: parsed.bodyText ?? null,
      bodyHtml: parsed.bodyHtml ?? null,
      attachments: storedAttachments,
      status: "received",
      messageIdHeader: parsed.messageId ?? null,
      inReplyTo: parsed.inReplyTo ?? null,
      referencesHeaders: parsed.references,
      rawHeaders: parsed.rawHeaders,
    })
    .returning();

  // 6. Update thread
  await updateThreadOnNewMessage(threadId);

  // 7. Fire webhook
  await deliverEvent(inbox.accountId, "message.received", {
    messageId: message.id,
    inboxId: inbox.id,
    threadId,
    from: parsed.from,
    to: parsed.to,
    subject: parsed.subject,
    direction: "inbound",
    receivedAt: message.createdAt.toISOString(),
  });

  console.log(
    `Inbound email processed: message=${message.id} thread=${threadId} inbox=${inbox.id}`,
  );
}

export function startInboundWorker(): Worker<InboundJobData> {
  const worker = new Worker<InboundJobData>(
    "inbound-email",
    processInboundJob,
    {
      connection: getRedisConnection(),
      concurrency: 3,
    },
  );

  worker.on("completed", (job) => {
    console.log(`Inbound job ${job.id} completed`);
  });

  worker.on("failed", (job, error) => {
    console.error(`Inbound job ${job?.id} failed:`, error.message);
  });

  return worker;
}

import { Worker, Job } from "bullmq";
import { and, eq, inArray, sql } from "drizzle-orm";
import { getRedisConnection } from "./connection.js";
import { sendEmail, type EmailAttachment } from "../services/ses.service.js";
import { downloadAttachment } from "../services/s3.service.js";
import { getDb } from "../db/client.js";
import { messages, inboxes } from "../db/schema.js";
import { env } from "../config/env.js";
import { deliverEvent } from "../services/webhook.service.js";
import type { EmailJobData } from "./email.queue.js";

const TERMINAL_STATUSES = ["sent", "delivered", "bounced", "complained"] as const;
const RETRYABLE_STATUSES = ["queued", "failed"] as const;

async function processEmailJob(job: Job<EmailJobData>) {
  const db = getDb();
  const {
    messageId, messageIdHeader, inReplyTo, references,
    from, to, cc, bcc, subject, bodyText, bodyHtml, inboxId,
    attachments: jobAttachments,
  } = job.data;

  const [currentMessage] = await db
    .select({
      id: messages.id,
      accountId: messages.accountId,
      threadId: messages.threadId,
      status: messages.status,
      sesMessageId: messages.sesMessageId,
    })
    .from(messages)
    .where(eq(messages.id, messageId))
    .limit(1);

  if (!currentMessage) {
    throw new Error(`Message not found: ${messageId}`);
  }

  if (
    currentMessage.sesMessageId ||
    TERMINAL_STATUSES.includes(
      currentMessage.status as (typeof TERMINAL_STATUSES)[number],
    )
  ) {
    return;
  }

  if (currentMessage.status === "sending" && job.attemptsMade > 0) {
    await db
      .update(messages)
      .set({
        status: "failed",
        errorMessage:
          "Previous send attempt may have completed; skipped automatic retry to avoid duplicate delivery.",
        retryCount: sql`${messages.retryCount} + 1`,
      })
      .where(eq(messages.id, messageId));
    return;
  }

  if (currentMessage.status !== "sending") {
    const [claimed] = await db
      .update(messages)
      .set({
        status: "sending",
        errorMessage: null,
      })
      .where(
        and(
          eq(messages.id, messageId),
          inArray(messages.status, [...RETRYABLE_STATUSES]),
        ),
      )
      .returning({ id: messages.id });

    if (!claimed) {
      return;
    }
  }

  let sesMessageId: string;
  try {
    // Download attachments from S3 if any
    let emailAttachments: EmailAttachment[] | undefined;
    if (jobAttachments?.length) {
      emailAttachments = await Promise.all(
        jobAttachments.map(async (att) => ({
          filename: att.filename,
          contentType: att.contentType,
          content: await downloadAttachment(att.key),
        })),
      );
    }

    sesMessageId = await sendEmail({
      from,
      to,
      cc,
      bcc,
      subject,
      bodyText,
      bodyHtml,
      messageIdHeader,
      inReplyTo,
      references,
      attachments: emailAttachments,
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    await db
      .update(messages)
      .set({
        status: "failed",
        errorMessage,
        retryCount: sql`${messages.retryCount} + 1`,
      })
      .where(eq(messages.id, messageId));

    throw error; // BullMQ will retry
  }

  const sentAt = new Date();

  // Update message to sent
  await db
    .update(messages)
    .set({
      status: "sent",
      sesMessageId,
      sentAt,
      errorMessage: null,
    })
    .where(eq(messages.id, messageId));

  // Increment sends_today on inbox
  await db
    .update(inboxes)
    .set({
      sendsToday: sql`${inboxes.sendsToday} + 1`,
      totalSent: sql`${inboxes.totalSent} + 1`,
      updatedAt: sentAt,
    })
    .where(eq(inboxes.id, inboxId));

  try {
    await deliverEvent(currentMessage.accountId, "message.sent", {
      messageId,
      inboxId,
      threadId: currentMessage.threadId,
      to,
      cc: cc ?? [],
      bcc: bcc ?? [],
      subject,
      sentAt: sentAt.toISOString(),
    });
  } catch (error) {
    console.error(
      `Failed to enqueue message.sent webhook for message ${messageId}:`,
      error,
    );
  }
}

export function startEmailWorker(): Worker<EmailJobData> {
  const config = env();

  const worker = new Worker<EmailJobData>("email-send", processEmailJob, {
    connection: getRedisConnection(),
    concurrency: config.EMAIL_QUEUE_CONCURRENCY,
  });

  worker.on("completed", (job) => {
    console.log(`Email job ${job.id} completed for message ${job.data.messageId}`);
  });

  worker.on("failed", (job, error) => {
    console.error(
      `Email job ${job?.id} failed for message ${job?.data.messageId}:`,
      error.message,
    );
  });

  return worker;
}

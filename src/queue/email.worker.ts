import { Worker, Job } from "bullmq";
import { eq, sql } from "drizzle-orm";
import { getRedisConnection } from "./connection.js";
import { sendEmail, type EmailAttachment } from "../services/ses.service.js";
import { downloadAttachment } from "../services/s3.service.js";
import { getDb } from "../db/client.js";
import { messages, inboxes } from "../db/schema.js";
import { env } from "../config/env.js";
import type { EmailJobData } from "./email.queue.js";

async function processEmailJob(job: Job<EmailJobData>) {
  const db = getDb();
  const {
    messageId, messageIdHeader, inReplyTo, references,
    from, to, cc, bcc, subject, bodyText, bodyHtml, inboxId,
    attachments: jobAttachments,
  } = job.data;

  // Update status to sending
  await db
    .update(messages)
    .set({ status: "sending" })
    .where(eq(messages.id, messageId));

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

    const sesMessageId = await sendEmail({
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

    // Update message to sent
    await db
      .update(messages)
      .set({
        status: "sent",
        sesMessageId,
        sentAt: new Date(),
      })
      .where(eq(messages.id, messageId));

    // Increment sends_today on inbox
    await db
      .update(inboxes)
      .set({
        sendsToday: sql`${inboxes.sendsToday} + 1`,
        totalSent: sql`${inboxes.totalSent} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(inboxes.id, inboxId));
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

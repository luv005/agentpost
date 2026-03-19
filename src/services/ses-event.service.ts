import { eq, sql } from "drizzle-orm";
import { getDb } from "../db/client.js";
import { messages, inboxes } from "../db/schema.js";
import { deliverEvent } from "./webhook.service.js";
import { env } from "../config/env.js";

export interface SesNotification {
  notificationType: "Bounce" | "Complaint" | "Delivery";
  mail: {
    messageId: string;
    source: string;
    destination: string[];
  };
  bounce?: {
    bounceType: string;
    bounceSubType: string;
    bouncedRecipients: { emailAddress: string }[];
  };
  complaint?: {
    complainedRecipients: { emailAddress: string }[];
    complaintFeedbackType?: string;
  };
  delivery?: {
    recipients: string[];
    timestamp: string;
  };
}

export async function processSesEvent(event: SesNotification): Promise<void> {
  const db = getDb();
  const config = env();

  // Look up message by SES message ID
  const [message] = await db
    .select()
    .from(messages)
    .where(eq(messages.sesMessageId, event.mail.messageId))
    .limit(1);

  if (!message) {
    console.warn(`SES event for unknown message: ${event.mail.messageId}`);
    return;
  }

  switch (event.notificationType) {
    case "Delivery": {
      if (message.status === "delivered") return;

      // Only update if currently "sent"
      if (message.status === "sent") {
        await db
          .update(messages)
          .set({ status: "delivered" })
          .where(eq(messages.id, message.id));
      }

      await deliverEvent(message.accountId, "message.delivered", {
        messageId: message.id,
        inboxId: message.inboxId,
        recipients: event.delivery?.recipients ?? [],
      });
      break;
    }

    case "Bounce": {
      if (message.status === "bounced") return;

      await db
        .update(messages)
        .set({ status: "bounced" })
        .where(eq(messages.id, message.id));

      // Increment bounce count on inbox
      await db
        .update(inboxes)
        .set({
          bounceCount: sql`${inboxes.bounceCount} + 1`,
          updatedAt: new Date(),
        })
        .where(eq(inboxes.id, message.inboxId));

      // Check bounce rate and auto-suspend if needed
      await checkAndSuspendInbox(message.inboxId, config);

      await deliverEvent(message.accountId, "message.bounced", {
        messageId: message.id,
        inboxId: message.inboxId,
        bounceType: event.bounce?.bounceType,
        bouncedRecipients: event.bounce?.bouncedRecipients?.map(
          (r) => r.emailAddress,
        ),
      });
      break;
    }

    case "Complaint": {
      if (message.status === "complained") return;

      await db
        .update(messages)
        .set({ status: "complained" })
        .where(eq(messages.id, message.id));

      // Increment complaint count on inbox
      await db
        .update(inboxes)
        .set({
          complaintCount: sql`${inboxes.complaintCount} + 1`,
          updatedAt: new Date(),
        })
        .where(eq(inboxes.id, message.inboxId));

      // Check complaint rate and auto-suspend if needed
      await checkAndSuspendInbox(message.inboxId, config);

      await deliverEvent(message.accountId, "message.complained", {
        messageId: message.id,
        inboxId: message.inboxId,
        complaintFeedbackType: event.complaint?.complaintFeedbackType,
      });
      break;
    }
  }
}

async function checkAndSuspendInbox(
  inboxId: string,
  config: ReturnType<typeof env>,
) {
  const db = getDb();

  const [inbox] = await db
    .select()
    .from(inboxes)
    .where(eq(inboxes.id, inboxId))
    .limit(1);

  if (!inbox || inbox.status === "suspended") return;

  // Minimum volume threshold to avoid false positives
  if (inbox.totalSent < 100) return;

  const bounceRate = inbox.bounceCount / inbox.totalSent;
  const complaintRate = inbox.complaintCount / inbox.totalSent;

  if (
    bounceRate > config.MAX_BOUNCE_RATE ||
    complaintRate > config.MAX_COMPLAINT_RATE
  ) {
    await db
      .update(inboxes)
      .set({ status: "suspended", updatedAt: new Date() })
      .where(eq(inboxes.id, inboxId));

    console.warn(
      `Inbox ${inboxId} auto-suspended: bounceRate=${bounceRate.toFixed(4)} complaintRate=${complaintRate.toFixed(4)}`,
    );
  }
}

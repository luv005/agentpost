import { z } from "zod";

export const sendMessageBody = z.object({
  to: z.array(z.string().email()).min(1).max(50),
  cc: z.array(z.string().email()).max(50).optional(),
  bcc: z.array(z.string().email()).max(50).optional(),
  subject: z.string().min(1).max(998),
  bodyText: z.string().max(256000).optional(),
  bodyHtml: z.string().max(256000).optional(),
  threadId: z.string().uuid().optional(),
  attachmentIds: z.array(z.string().uuid()).max(10).optional(),
});

export const sendMessageParams = z.object({
  inboxId: z.string().uuid(),
});

export const listMessagesParams = z.object({
  inboxId: z.string().uuid(),
});

export const listMessagesQuery = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
  status: z
    .enum(["queued", "sending", "sent", "delivered", "failed", "bounced", "complained", "received"])
    .optional(),
});

export const messageIdParams = z.object({
  id: z.string().uuid(),
});

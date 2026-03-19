import { z } from "zod";

export const createWebhookBody = z.object({
  url: z.string().url().max(2048),
  events: z
    .array(z.enum(["message.received", "message.sent", "message.bounced"]))
    .min(1)
    .optional(),
});

export const updateWebhookBody = z.object({
  url: z.string().url().max(2048).optional(),
  events: z
    .array(z.enum(["message.received", "message.sent", "message.bounced"]))
    .min(1)
    .optional(),
  isActive: z.boolean().optional(),
});

export const webhookParams = z.object({
  id: z.string().uuid(),
});

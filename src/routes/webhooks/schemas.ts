import { z } from "zod";

const webhookEventSchema = z.enum([
  "message.received",
  "message.sent",
  "message.delivered",
  "message.bounced",
  "message.complained",
]);

export const createWebhookBody = z.object({
  url: z.string().url().max(2048),
  events: z.array(webhookEventSchema).min(1).optional(),
});

export const updateWebhookBody = z.object({
  url: z.string().url().max(2048).optional(),
  events: z.array(webhookEventSchema).min(1).optional(),
  isActive: z.boolean().optional(),
});

export const webhookParams = z.object({
  id: z.string().uuid(),
});

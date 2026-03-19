import { z } from "zod";

export const createInboxBody = z.object({
  address: z.string().email().max(255).optional(),
  displayName: z.string().max(255).optional(),
  domainId: z.string().uuid().optional(),
});

export const listInboxesQuery = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

export const inboxParams = z.object({
  id: z.string().uuid(),
});

import { z } from "zod";

export const createApiKeyBody = z.object({
  name: z.string().min(1).max(255).optional(),
});

export const apiKeyIdParams = z.object({
  id: z.string().uuid(),
});

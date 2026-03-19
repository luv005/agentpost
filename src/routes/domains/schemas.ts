import { z } from "zod";

export const addDomainBody = z.object({
  domain: z
    .string()
    .min(3)
    .max(255)
    .regex(
      /^[a-zA-Z0-9][a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
      "Invalid domain format",
    ),
});

export const domainParams = z.object({
  id: z.string().uuid(),
});

export const listDomainsQuery = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

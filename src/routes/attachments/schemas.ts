import { z } from "zod";

export const attachmentParams = z.object({
  id: z.string().uuid(),
});

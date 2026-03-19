import { z } from "zod";

export const signupBody = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(255),
});

export const magicLinkBody = z.object({
  email: z.string().email(),
});

export const verifyQuery = z.object({
  token: z.string().min(1),
});

export const googleCallbackQuery = z.object({
  code: z.string().min(1),
});

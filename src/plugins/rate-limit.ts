import type { FastifyInstance } from "fastify";
import rateLimit from "@fastify/rate-limit";
import { env } from "../config/env.js";

export async function rateLimitPlugin(app: FastifyInstance) {
  const config = env();

  await app.register(rateLimit, {
    max: config.RATE_LIMIT_GLOBAL_MAX,
    timeWindow: config.RATE_LIMIT_GLOBAL_WINDOW_MS,
    keyGenerator: (request) => {
      // Rate limit by account if authenticated, else by IP
      return request.account?.id ?? request.ip;
    },
    errorResponseBuilder: (_request, context) => ({
      error: {
        code: "RATE_LIMIT_EXCEEDED",
        message: `Rate limit exceeded. Try again in ${Math.ceil((context.ttl ?? 60000) / 1000)} seconds.`,
        status: 429,
      },
    }),
  });
}

import type { FastifyInstance, FastifyError } from "fastify";
import { AppError } from "../lib/errors.js";
import { ZodError } from "zod";

export async function errorHandler(app: FastifyInstance) {
  app.setErrorHandler((error: FastifyError | Error, _request, reply) => {
    if (error instanceof AppError) {
      return reply.status(error.statusCode).send({
        error: {
          code: error.code,
          message: error.message,
          status: error.statusCode,
        },
      });
    }

    if (error instanceof ZodError) {
      return reply.status(400).send({
        error: {
          code: "VALIDATION_ERROR",
          message: "Request validation failed",
          status: 400,
          details: error.flatten().fieldErrors,
        },
      });
    }

    const fastifyError = error as FastifyError;

    // Fastify validation errors
    if (fastifyError.validation) {
      return reply.status(400).send({
        error: {
          code: "VALIDATION_ERROR",
          message: fastifyError.message,
          status: 400,
        },
      });
    }

    // Rate limit errors from @fastify/rate-limit
    if (fastifyError.statusCode === 429) {
      return reply.status(429).send({
        error: {
          code: "RATE_LIMIT_EXCEEDED",
          message: fastifyError.message,
          status: 429,
        },
      });
    }

    app.log.error(error);
    return reply.status(500).send({
      error: {
        code: "INTERNAL_ERROR",
        message: "An unexpected error occurred",
        status: 500,
      },
    });
  });
}

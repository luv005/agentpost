import { buildApp } from "../../src/app.js";
import type { FastifyInstance } from "fastify";

export async function createTestApp(): Promise<FastifyInstance> {
  const app = await buildApp();
  return app;
}

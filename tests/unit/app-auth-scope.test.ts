import { afterEach, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { buildApp } from "../../src/app.js";

let app: FastifyInstance | null = null;

afterEach(async () => {
  if (app) {
    await app.close();
    app = null;
  }
});

describe("app auth scope", () => {
  it("protects /account on the root app", async () => {
    process.env.NODE_ENV = "test";
    process.env.DATABASE_URL = process.env.DATABASE_URL ?? "postgres://user:pass@localhost:5432/agentpost_test";

    app = await buildApp();

    const response = await app.inject({
      method: "GET",
      url: "/account",
    });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toEqual({
      error: {
        code: "UNAUTHORIZED",
        message: "Invalid or missing API key",
        status: 401,
      },
    });
  });
});

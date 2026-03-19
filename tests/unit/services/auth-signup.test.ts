import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../../src/config/env.js", () => ({
  env: () => ({
    JWT_SECRET: "test-secret-key-for-testing-only",
    JWT_EXPIRES_IN: "1h",
    MAGIC_LINK_EXPIRES_MINUTES: 15,
    APP_URL: "http://localhost:3000",
    SES_FROM_DOMAIN: "agentsend.io",
    SES_DRY_RUN: true,
    GOOGLE_CLIENT_ID: "test-client-id",
    GOOGLE_CLIENT_SECRET: "test-secret",
    GOOGLE_REDIRECT_URI: "http://localhost:3000/auth/google/callback",
  }),
  loadEnv: () => ({}),
}));

const limitMock = vi.fn();
const whereMock = vi.fn(() => ({ limit: limitMock }));
const fromMock = vi.fn(() => ({ where: whereMock }));
const selectMock = vi.fn(() => ({ from: fromMock }));

vi.mock("../../../src/db/client.js", () => ({
  getDb: () => ({
    select: selectMock,
  }),
}));

vi.mock("../../../src/services/api-key.service.js", () => ({
  createApiKey: vi.fn(),
}));

import { publicSignup } from "../../../src/services/auth.service.js";

describe("publicSignup", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects signups for existing accounts", async () => {
    limitMock.mockResolvedValueOnce([{ id: "acct_123" }]);

    await expect(
      publicSignup("user@example.com", "Existing User"),
    ).rejects.toMatchObject({
      code: "ACCOUNT_EXISTS",
      statusCode: 409,
    });
  });
});

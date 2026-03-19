import { describe, it, expect, vi, beforeEach } from "vitest";

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

import { signJwt, verifyJwt } from "../../../src/services/auth.service.js";

describe("JWT", () => {
  it("should sign and verify a JWT", () => {
    const token = signJwt("account-123", "test@example.com");
    expect(token).toBeTruthy();
    expect(typeof token).toBe("string");

    const payload = verifyJwt(token);
    expect(payload).not.toBeNull();
    expect(payload!.sub).toBe("account-123");
    expect(payload!.email).toBe("test@example.com");
  });

  it("should return null for invalid tokens", () => {
    const payload = verifyJwt("invalid-token");
    expect(payload).toBeNull();
  });

  it("should return null for tampered tokens", () => {
    const token = signJwt("account-123", "test@example.com");
    const tampered = token + "x";
    const payload = verifyJwt(tampered);
    expect(payload).toBeNull();
  });

  it("should generate different tokens for different accounts", () => {
    const token1 = signJwt("account-1", "a@example.com");
    const token2 = signJwt("account-2", "b@example.com");
    expect(token1).not.toBe(token2);
  });
});

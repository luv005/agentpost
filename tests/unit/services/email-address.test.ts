import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the env module before importing the module under test
vi.mock("../../../src/config/env.js", () => ({
  env: () => ({
    SES_FROM_DOMAIN: "agentsend.io",
  }),
  loadEnv: () => ({
    SES_FROM_DOMAIN: "agentsend.io",
  }),
}));

import { generateEmailAddress } from "../../../src/lib/email-address.js";

describe("Email Address Generation", () => {
  it("should generate addresses with agent- prefix", () => {
    const address = generateEmailAddress();
    expect(address).toMatch(/^agent-/);
  });

  it("should end with @agentsend.io", () => {
    const address = generateEmailAddress();
    expect(address).toMatch(/@agentsend\.io$/);
  });

  it("should generate valid email format", () => {
    const address = generateEmailAddress();
    expect(address).toMatch(/^agent-[a-zA-Z0-9_-]+@agentsend\.io$/);
  });

  it("should generate unique addresses", () => {
    const addresses = new Set(
      Array.from({ length: 100 }, () => generateEmailAddress()),
    );
    expect(addresses.size).toBe(100);
  });
});

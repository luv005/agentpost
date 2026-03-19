import { describe, it, expect, vi } from "vitest";

vi.mock("../../../src/config/env.js", () => ({
  env: () => ({ SES_FROM_DOMAIN: "agentsend.io" }),
  loadEnv: () => ({ SES_FROM_DOMAIN: "agentsend.io" }),
}));

import { generateMessageId } from "../../../src/lib/message-id.js";

describe("generateMessageId", () => {
  it("should generate valid RFC 5322 Message-ID format", () => {
    const id = generateMessageId();
    expect(id).toMatch(/^<.+@agentsend\.io>$/);
  });

  it("should generate unique IDs", () => {
    const ids = new Set(Array.from({ length: 100 }, () => generateMessageId()));
    expect(ids.size).toBe(100);
  });
});

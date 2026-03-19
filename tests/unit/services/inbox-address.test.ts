import { describe, expect, it } from "vitest";

import { normalizeInboxAddress } from "../../../src/services/inbox.service.js";

describe("normalizeInboxAddress", () => {
  it("normalizes a requested inbox address for the expected domain", () => {
    expect(normalizeInboxAddress("Hello.World@AgentSend.io", "agentsend.io")).toBe(
      "hello.world@agentsend.io",
    );
  });

  it("rejects inbox addresses on the wrong domain", () => {
    expect(() =>
      normalizeInboxAddress("hello@example.com", "agentsend.io"),
    ).toThrow("Inbox address must use @agentsend.io");
  });

  it("rejects invalid local parts", () => {
    expect(() =>
      normalizeInboxAddress("hello+test@agentsend.io", "agentsend.io"),
    ).toThrow(
      "Inbox username can only contain letters, numbers, dots, underscores, and hyphens.",
    );
  });
});

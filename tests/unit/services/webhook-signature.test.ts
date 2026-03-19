import { describe, it, expect } from "vitest";
import { signPayload, generateWebhookSecret } from "../../../src/services/webhook.service.js";
import { createHmac } from "node:crypto";

describe("Webhook Signatures", () => {
  it("should generate a secret with whsec_ prefix", () => {
    const secret = generateWebhookSecret();
    expect(secret).toMatch(/^whsec_[0-9a-f]{48}$/);
  });

  it("should produce consistent HMAC-SHA256 signatures", () => {
    const secret = "whsec_test123";
    const payload = '{"event":"message.received","data":{}}';

    const sig = signPayload(payload, secret);
    const expected = createHmac("sha256", secret).update(payload).digest("hex");

    expect(sig).toBe(expected);
  });

  it("should produce different signatures for different payloads", () => {
    const secret = "whsec_test123";
    const sig1 = signPayload("payload1", secret);
    const sig2 = signPayload("payload2", secret);
    expect(sig1).not.toBe(sig2);
  });
});

import { describe, expect, it } from "vitest";
import {
  createWebhookBody,
  updateWebhookBody,
} from "../../../src/routes/webhooks/schemas.js";

describe("webhook schemas", () => {
  it("accepts delivery and complaint events", () => {
    const created = createWebhookBody.parse({
      url: "https://example.com/webhooks/agentsend",
      events: ["message.delivered", "message.complained"],
    });
    const updated = updateWebhookBody.parse({
      events: ["message.received", "message.sent", "message.delivered"],
    });

    expect(created.events).toEqual([
      "message.delivered",
      "message.complained",
    ]);
    expect(updated.events).toEqual([
      "message.received",
      "message.sent",
      "message.delivered",
    ]);
  });
});

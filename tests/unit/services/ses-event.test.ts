import { describe, it, expect } from "vitest";
import type { SesNotification } from "../../../src/services/ses-event.service.js";

describe("SES Event Types", () => {
  it("should define Delivery notification structure", () => {
    const event: SesNotification = {
      notificationType: "Delivery",
      mail: {
        messageId: "ses-123",
        source: "sender@agentsend.io",
        destination: ["user@example.com"],
      },
      delivery: {
        recipients: ["user@example.com"],
        timestamp: new Date().toISOString(),
      },
    };
    expect(event.notificationType).toBe("Delivery");
    expect(event.delivery?.recipients).toHaveLength(1);
  });

  it("should define Bounce notification structure", () => {
    const event: SesNotification = {
      notificationType: "Bounce",
      mail: {
        messageId: "ses-456",
        source: "sender@agentsend.io",
        destination: ["bad@example.com"],
      },
      bounce: {
        bounceType: "Permanent",
        bounceSubType: "General",
        bouncedRecipients: [{ emailAddress: "bad@example.com" }],
      },
    };
    expect(event.notificationType).toBe("Bounce");
    expect(event.bounce?.bounceType).toBe("Permanent");
  });

  it("should define Complaint notification structure", () => {
    const event: SesNotification = {
      notificationType: "Complaint",
      mail: {
        messageId: "ses-789",
        source: "sender@agentsend.io",
        destination: ["user@example.com"],
      },
      complaint: {
        complainedRecipients: [{ emailAddress: "user@example.com" }],
        complaintFeedbackType: "abuse",
      },
    };
    expect(event.notificationType).toBe("Complaint");
    expect(event.complaint?.complaintFeedbackType).toBe("abuse");
  });
});

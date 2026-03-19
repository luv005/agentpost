import { describe, it, expect } from "vitest";
import { parseEmail } from "../../../src/smtp/parser.js";

const SIMPLE_EMAIL = Buffer.from(
  [
    "From: sender@example.com",
    "To: agent-test@agentsend.io",
    "Subject: Test email",
    "Message-ID: <abc123@example.com>",
    "Content-Type: text/plain",
    "",
    "Hello, this is a test email.",
  ].join("\r\n"),
);

const REPLY_EMAIL = Buffer.from(
  [
    "From: sender@example.com",
    "To: agent-test@agentsend.io",
    "Subject: Re: Test email",
    "Message-ID: <def456@example.com>",
    "In-Reply-To: <abc123@example.com>",
    "References: <abc123@example.com>",
    "Content-Type: text/plain",
    "",
    "This is a reply.",
  ].join("\r\n"),
);

describe("parseEmail", () => {
  it("should parse a simple email", async () => {
    const parsed = await parseEmail(SIMPLE_EMAIL);
    expect(parsed.from).toBe("sender@example.com");
    expect(parsed.to).toContain("agent-test@agentsend.io");
    expect(parsed.subject).toBe("Test email");
    expect(parsed.messageId).toBe("<abc123@example.com>");
    expect(parsed.bodyText).toContain("Hello, this is a test email.");
  });

  it("should parse reply headers", async () => {
    const parsed = await parseEmail(REPLY_EMAIL);
    expect(parsed.inReplyTo).toBe("<abc123@example.com>");
    expect(parsed.references).toContain("<abc123@example.com>");
    expect(parsed.messageId).toBe("<def456@example.com>");
  });

  it("should handle emails without attachments", async () => {
    const parsed = await parseEmail(SIMPLE_EMAIL);
    expect(parsed.attachments).toHaveLength(0);
  });
});

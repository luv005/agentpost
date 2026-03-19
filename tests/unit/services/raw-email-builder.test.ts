import { describe, it, expect, vi } from "vitest";

vi.mock("../../../src/config/env.js", () => ({
  env: () => ({
    SES_DRY_RUN: true,
    AWS_REGION: "us-east-1",
    AWS_ACCESS_KEY_ID: "",
    AWS_SECRET_ACCESS_KEY: "",
  }),
  loadEnv: () => ({}),
}));

// We can't easily test buildRawEmail directly since it's not exported,
// but we can test sendEmail in dry-run mode to verify it handles attachments
import { sendEmail } from "../../../src/services/ses.service.js";

describe("sendEmail with attachments (dry run)", () => {
  it("should accept attachments without throwing", async () => {
    const id = await sendEmail({
      from: "test@agentsend.io",
      to: ["user@example.com"],
      subject: "Test",
      bodyText: "Hello",
      attachments: [
        {
          filename: "test.txt",
          contentType: "text/plain",
          content: Buffer.from("hello world"),
        },
      ],
    });
    expect(id).toMatch(/^dry-run-/);
  });

  it("should handle multiple attachments", async () => {
    const id = await sendEmail({
      from: "test@agentsend.io",
      to: ["user@example.com"],
      subject: "Test",
      bodyText: "Hello",
      bodyHtml: "<p>Hello</p>",
      attachments: [
        {
          filename: "file1.pdf",
          contentType: "application/pdf",
          content: Buffer.from("pdf data"),
        },
        {
          filename: "file2.png",
          contentType: "image/png",
          content: Buffer.from("png data"),
        },
      ],
    });
    expect(id).toMatch(/^dry-run-/);
  });

  it("should handle no attachments", async () => {
    const id = await sendEmail({
      from: "test@agentsend.io",
      to: ["user@example.com"],
      subject: "Test",
      bodyText: "Hello",
    });
    expect(id).toMatch(/^dry-run-/);
  });
});

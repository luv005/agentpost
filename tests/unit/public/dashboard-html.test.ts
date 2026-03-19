import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

function readDashboardHtml(): string {
  return readFileSync(resolve(process.cwd(), "public", "dashboard.html"), "utf8");
}

function extractInlineScript(html: string): string {
  const match = html.match(/<script>([\s\S]*)<\/script>\s*<\/body>/);
  if (!match) {
    throw new Error("Dashboard inline script not found");
  }
  return match[1];
}

describe("dashboard.html", () => {
  it("has an inline script that parses as valid JavaScript", () => {
    const script = extractInlineScript(readDashboardHtml());
    expect(() => new Function(script)).not.toThrow();
  });

  it("includes the implemented dashboard management actions", () => {
    const html = readDashboardHtml();
    expect(html).toContain("deleteInbox");
    expect(html).toContain("toggleWebhook");
    expect(html).toContain("showDomainDns");
    expect(html).toContain("verifyDomain");
    expect(html).toContain("verificationStatus");
    expect(html).toContain("isActive");
  });
});

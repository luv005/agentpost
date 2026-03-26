import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { generateSitemapXml } from "../../../src/lib/sitemap.js";

function readSitemapXml(): string {
  return readFileSync(resolve(process.cwd(), "public", "sitemap.xml"), "utf8");
}

describe("sitemap.xml", () => {
  it("matches the generated sitemap for the public site", () => {
    const xml = generateSitemapXml({
      baseUrl: "https://agentsend.io",
      publicDir: resolve(process.cwd(), "public"),
    });

    expect(readSitemapXml()).toBe(xml);
  });

  it("includes public pages and excludes private dashboard routes", () => {
    const xml = readSitemapXml();

    expect(xml).toContain("<loc>https://agentsend.io/</loc>");
    expect(xml).toContain("<loc>https://agentsend.io/ja</loc>");
    expect(xml).toContain("<loc>https://agentsend.io/zh-tw</loc>");
    expect(xml).toContain("<loc>https://agentsend.io/pt</loc>");
    expect(xml).toContain("<loc>https://agentsend.io/th</loc>");
    expect(xml).toContain("<loc>https://agentsend.io/docs</loc>");
    expect(xml).toContain("<loc>https://agentsend.io/skill</loc>");
    expect(xml).toContain("<loc>https://agentsend.io/blog</loc>");
    expect(xml).toContain(
      "<loc>https://agentsend.io/blog/how-to-give-your-ai-agent-an-email-inbox</loc>",
    );
    expect(xml).toContain(
      '<xhtml:link rel="alternate" hreflang="zh-Hant" href="https://agentsend.io/zh-tw"/>',
    );
    expect(xml).not.toContain("https://agentsend.io/dashboard");
    expect(xml).not.toContain("https://agentsend.io/inboxes");
    expect(xml).not.toContain("https://agentsend.io/account");
  });
});

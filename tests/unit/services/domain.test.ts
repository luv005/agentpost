import { describe, it, expect } from "vitest";

describe("Domain Validation", () => {
  const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

  it("should accept valid domains", () => {
    expect(domainRegex.test("example.com")).toBe(true);
    expect(domainRegex.test("sub.example.com")).toBe(true);
    expect(domainRegex.test("my-domain.io")).toBe(true);
    expect(domainRegex.test("example.co.uk")).toBe(true);
  });

  it("should reject invalid domains", () => {
    expect(domainRegex.test("")).toBe(false);
    expect(domainRegex.test(".com")).toBe(false);
    expect(domainRegex.test("localhost")).toBe(false);
    expect(domainRegex.test("-bad.com")).toBe(false);
    expect(domainRegex.test("a.b")).toBe(false);
  });
});

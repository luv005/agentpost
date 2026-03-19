import { describe, it, expect } from "vitest";
import { normalizeSubject } from "../../../src/lib/thread-subject.js";

describe("normalizeSubject", () => {
  it("should strip Re: prefix", () => {
    expect(normalizeSubject("Re: Hello")).toBe("Hello");
  });

  it("should strip multiple Re: prefixes", () => {
    expect(normalizeSubject("Re: Re: Re: Hello")).toBe("Hello");
  });

  it("should strip Fwd: prefix", () => {
    expect(normalizeSubject("Fwd: Hello")).toBe("Hello");
  });

  it("should strip FW: prefix", () => {
    expect(normalizeSubject("FW: Hello")).toBe("Hello");
  });

  it("should strip mixed Re:/Fwd: prefixes", () => {
    expect(normalizeSubject("Re: Fwd: Re: Hello")).toBe("Hello");
  });

  it("should strip numbered Re[2]: prefixes", () => {
    expect(normalizeSubject("Re[2]: Hello")).toBe("Hello");
  });

  it("should be case insensitive", () => {
    expect(normalizeSubject("RE: hello")).toBe("hello");
    expect(normalizeSubject("re: hello")).toBe("hello");
  });

  it("should normalize whitespace", () => {
    expect(normalizeSubject("  Re:   Hello   world  ")).toBe("Hello world");
  });

  it("should handle empty string", () => {
    expect(normalizeSubject("")).toBe("");
  });

  it("should leave clean subjects unchanged", () => {
    expect(normalizeSubject("Hello world")).toBe("Hello world");
  });
});

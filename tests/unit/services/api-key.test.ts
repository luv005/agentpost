import { describe, it, expect } from "vitest";
import { generateApiKey } from "../../../src/lib/id.js";

describe("API Key Generation", () => {
  it("should generate keys with ask_ prefix", () => {
    const key = generateApiKey();
    expect(key).toMatch(/^ask_/);
  });

  it("should generate keys of correct length", () => {
    const key = generateApiKey();
    // ask_ (4 chars) + nanoid(40) = 44 chars
    expect(key.length).toBe(44);
  });

  it("should generate unique keys", () => {
    const keys = new Set(Array.from({ length: 100 }, () => generateApiKey()));
    expect(keys.size).toBe(100);
  });
});

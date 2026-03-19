import { beforeEach, describe, expect, it, vi } from "vitest";

const returningMock = vi.fn();
const valuesMock = vi.fn(() => ({ returning: returningMock }));
const insertMock = vi.fn(() => ({ values: valuesMock }));

const selectLimitMock = vi.fn();
const selectWhereMock = vi.fn(() => ({ limit: selectLimitMock }));
const selectFromMock = vi.fn(() => ({ where: selectWhereMock }));
const selectMock = vi.fn(() => ({ from: selectFromMock }));

vi.mock("../../../src/db/client.js", () => ({
  getDb: () => ({
    insert: insertMock,
    select: selectMock,
  }),
}));

import { createApiKey } from "../../../src/services/api-key.service.js";

describe("createApiKey", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("falls back to loading the inserted key if returning() yields no row", async () => {
    returningMock.mockResolvedValueOnce([]);
    selectLimitMock.mockResolvedValueOnce([
      {
        id: "key_123",
        name: "Primary Key",
      },
    ]);

    const result = await createApiKey("acct_123", "Primary Key");

    expect(result).toMatchObject({
      id: "key_123",
      name: "Primary Key",
      prefix: expect.stringMatching(/^ask_/),
      key: expect.stringMatching(/^ask_/),
    });
  });
});

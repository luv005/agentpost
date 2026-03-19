import { describe, it, expect, vi, beforeEach } from "vitest";
import { HttpClient } from "../src/client.js";
import { AuthenticationError, NotFoundError, AgentSendError } from "../src/errors.js";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

function jsonResponse(data: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: "OK",
    headers: new Headers(),
    json: () => Promise.resolve(data),
  };
}

function errorResponse(status: number, code: string, message: string) {
  return {
    ok: false,
    status,
    statusText: message,
    headers: new Headers(),
    json: () => Promise.resolve({ error: { code, message } }),
  };
}

describe("HttpClient", () => {
  let client: HttpClient;

  beforeEach(() => {
    mockFetch.mockReset();
    client = new HttpClient({
      apiKey: "test-key",
      baseUrl: "https://api.test.io",
      maxRetries: 2,
      retryDelay: 10,
      timeout: 5000,
    });
  });

  it("should make GET request with auth header", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ id: "123" }));

    const result = await client.request("GET", "/inboxes/123");

    expect(result).toEqual({ id: "123" });
    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, opts] = mockFetch.mock.calls[0];
    expect(url).toBe("https://api.test.io/inboxes/123");
    expect(opts.headers.Authorization).toBe("Bearer test-key");
  });

  it("should make POST request with body", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ id: "456" }, 201));

    await client.request("POST", "/inboxes", { body: { displayName: "Bot" } });

    const [, opts] = mockFetch.mock.calls[0];
    expect(opts.method).toBe("POST");
    expect(opts.body).toBe('{"displayName":"Bot"}');
  });

  it("should include query params", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ data: [] }));

    await client.request("GET", "/inboxes", { query: { limit: 10, offset: 0 } });

    const [url] = mockFetch.mock.calls[0];
    expect(url).toContain("limit=10");
    expect(url).toContain("offset=0");
  });

  it("should throw AuthenticationError on 401", async () => {
    mockFetch.mockResolvedValueOnce(
      errorResponse(401, "UNAUTHORIZED", "Invalid key"),
    );

    await expect(client.request("GET", "/inboxes")).rejects.toThrow(
      AuthenticationError,
    );
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("should throw NotFoundError on 404", async () => {
    mockFetch.mockResolvedValueOnce(
      errorResponse(404, "NOT_FOUND", "Not found"),
    );

    await expect(client.request("GET", "/inboxes/x")).rejects.toThrow(
      NotFoundError,
    );
  });

  it("should retry on 500 and eventually succeed", async () => {
    mockFetch
      .mockResolvedValueOnce(errorResponse(500, "INTERNAL_ERROR", "fail"))
      .mockResolvedValueOnce(jsonResponse({ ok: true }));

    const result = await client.request("GET", "/health");
    expect(result).toEqual({ ok: true });
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it("should throw after exhausting retries", async () => {
    mockFetch.mockResolvedValue(errorResponse(500, "INTERNAL_ERROR", "fail"));

    await expect(client.request("GET", "/health")).rejects.toThrow(
      AgentSendError,
    );
    expect(mockFetch).toHaveBeenCalledTimes(3); // 1 initial + 2 retries
  });

  it("should handle 204 No Content", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 204,
      statusText: "No Content",
      headers: new Headers(),
      json: () => Promise.reject(new Error("No body")),
    });

    const result = await client.request("DELETE", "/inboxes/123");
    expect(result).toBeUndefined();
  });
});

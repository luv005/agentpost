import {
  AgentSendError,
  AuthenticationError,
  NotFoundError,
  RateLimitError,
  ValidationError,
} from "./errors.js";
import type { AgentSendConfig } from "./types.js";

const DEFAULT_BASE_URL = "https://api.agentsend.io";
const DEFAULT_MAX_RETRIES = 3;
const DEFAULT_RETRY_DELAY = 1000;
const DEFAULT_TIMEOUT = 30000;

export class HttpClient {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly maxRetries: number;
  private readonly retryDelay: number;
  private readonly timeout: number;

  constructor(config: AgentSendConfig) {
    this.apiKey = config.apiKey;
    this.baseUrl = (config.baseUrl ?? DEFAULT_BASE_URL).replace(/\/$/, "");
    this.maxRetries = config.maxRetries ?? DEFAULT_MAX_RETRIES;
    this.retryDelay = config.retryDelay ?? DEFAULT_RETRY_DELAY;
    this.timeout = config.timeout ?? DEFAULT_TIMEOUT;
  }

  async request<T>(
    method: string,
    path: string,
    options?: {
      body?: unknown;
      query?: Record<string, string | number | undefined>;
    },
  ): Promise<T> {
    const url = this.buildUrl(path, options?.query);
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.apiKey}`,
      "Content-Type": "application/json",
    };

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      if (attempt > 0) {
        const delay = this.retryDelay * Math.pow(2, attempt - 1);
        await sleep(delay);
      }

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);

        const response = await fetch(url, {
          method,
          headers,
          body: options?.body ? JSON.stringify(options.body) : undefined,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (response.ok) {
          if (response.status === 204) return undefined as T;
          return (await response.json()) as T;
        }

        // Parse error
        const errorBody = await response.json().catch(() => ({})) as {
          error?: { code?: string; message?: string };
        };
        const code = errorBody.error?.code ?? "UNKNOWN";
        const message = errorBody.error?.message ?? response.statusText;

        // Don't retry client errors (except 429)
        if (response.status === 401) throw new AuthenticationError(message);
        if (response.status === 404) throw new NotFoundError(message);
        if (response.status === 400) throw new ValidationError(message);

        if (response.status === 429) {
          const retryAfter = parseInt(
            response.headers.get("retry-after") ?? "",
            10,
          );
          if (attempt === this.maxRetries) {
            throw new RateLimitError(message, retryAfter || undefined);
          }
          if (retryAfter) await sleep(retryAfter * 1000);
          lastError = new RateLimitError(message, retryAfter || undefined);
          continue;
        }

        // Retry on 5xx
        if (response.status >= 500) {
          lastError = new AgentSendError(response.status, code, message);
          if (attempt === this.maxRetries) throw lastError;
          continue;
        }

        throw new AgentSendError(response.status, code, message);
      } catch (err) {
        if (
          err instanceof AgentSendError ||
          err instanceof AuthenticationError ||
          err instanceof NotFoundError ||
          err instanceof ValidationError
        ) {
          throw err;
        }

        lastError = err instanceof Error ? err : new Error(String(err));
        if (attempt === this.maxRetries) throw lastError;
      }
    }

    throw lastError ?? new Error("Request failed");
  }

  private buildUrl(
    path: string,
    query?: Record<string, string | number | undefined>,
  ): string {
    const url = new URL(`${this.baseUrl}${path}`);
    if (query) {
      for (const [key, value] of Object.entries(query)) {
        if (value !== undefined) url.searchParams.set(key, String(value));
      }
    }
    return url.toString();
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

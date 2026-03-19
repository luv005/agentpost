import type { HttpClient } from "../client.js";
import type {
  Thread,
  Message,
  PaginatedResponse,
  PaginationParams,
} from "../types.js";

export class Threads {
  constructor(private client: HttpClient) {}

  async list(
    inboxId: string,
    params?: PaginationParams,
  ): Promise<PaginatedResponse<Thread>> {
    return this.client.request("GET", `/inboxes/${inboxId}/threads`, {
      query: params as Record<string, number>,
    });
  }

  async get(id: string): Promise<Thread> {
    return this.client.request("GET", `/threads/${id}`);
  }

  async messages(
    id: string,
    params?: PaginationParams,
  ): Promise<PaginatedResponse<Message>> {
    return this.client.request("GET", `/threads/${id}/messages`, {
      query: params as Record<string, number>,
    });
  }
}

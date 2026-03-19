import type { HttpClient } from "../client.js";
import type {
  Inbox,
  CreateInboxParams,
  PaginatedResponse,
  PaginationParams,
} from "../types.js";

export class Inboxes {
  constructor(private client: HttpClient) {}

  async create(params?: CreateInboxParams): Promise<Inbox> {
    return this.client.request("POST", "/inboxes", { body: params ?? {} });
  }

  async list(params?: PaginationParams): Promise<PaginatedResponse<Inbox>> {
    return this.client.request("GET", "/inboxes", { query: params as Record<string, number> });
  }

  async get(id: string): Promise<Inbox> {
    return this.client.request("GET", `/inboxes/${id}`);
  }

  async delete(id: string): Promise<void> {
    return this.client.request("DELETE", `/inboxes/${id}`);
  }
}

import type { HttpClient } from "../client.js";
import type {
  Message,
  SendMessageParams,
  ListMessagesParams,
  PaginatedResponse,
} from "../types.js";

export class Messages {
  constructor(private client: HttpClient) {}

  async send(inboxId: string, params: SendMessageParams): Promise<Message> {
    return this.client.request("POST", `/inboxes/${inboxId}/messages`, {
      body: params,
    });
  }

  async list(
    inboxId: string,
    params?: ListMessagesParams,
  ): Promise<PaginatedResponse<Message>> {
    return this.client.request("GET", `/inboxes/${inboxId}/messages`, {
      query: params as Record<string, string | number>,
    });
  }

  async get(id: string): Promise<Message> {
    return this.client.request("GET", `/messages/${id}`);
  }

  async delete(id: string): Promise<void> {
    return this.client.request("DELETE", `/messages/${id}`);
  }
}

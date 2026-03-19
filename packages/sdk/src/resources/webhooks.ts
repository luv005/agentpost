import type { HttpClient } from "../client.js";
import type {
  Webhook,
  CreateWebhookParams,
  UpdateWebhookParams,
} from "../types.js";

export class Webhooks {
  constructor(private client: HttpClient) {}

  async create(params: CreateWebhookParams): Promise<Webhook> {
    return this.client.request("POST", "/webhooks", { body: params });
  }

  async list(): Promise<{ data: Webhook[] }> {
    return this.client.request("GET", "/webhooks");
  }

  async get(id: string): Promise<Webhook> {
    return this.client.request("GET", `/webhooks/${id}`);
  }

  async update(id: string, params: UpdateWebhookParams): Promise<Webhook> {
    return this.client.request("PUT", `/webhooks/${id}`, { body: params });
  }

  async delete(id: string): Promise<void> {
    return this.client.request("DELETE", `/webhooks/${id}`);
  }
}

import type { HttpClient } from "../client.js";
import type { Attachment } from "../types.js";

export class Attachments {
  constructor(private client: HttpClient) {}

  async get(id: string): Promise<Attachment> {
    return this.client.request("GET", `/attachments/${id}`);
  }
}

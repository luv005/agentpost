import type { HttpClient } from "../client.js";
import type {
  Domain,
  AddDomainParams,
  PaginatedResponse,
  PaginationParams,
} from "../types.js";

export class Domains {
  constructor(private client: HttpClient) {}

  async add(params: AddDomainParams): Promise<Domain> {
    return this.client.request("POST", "/domains", { body: params });
  }

  async list(params?: PaginationParams): Promise<PaginatedResponse<Domain>> {
    return this.client.request("GET", "/domains", {
      query: params as Record<string, number>,
    });
  }

  async get(id: string): Promise<Domain> {
    return this.client.request("GET", `/domains/${id}`);
  }

  async verify(id: string): Promise<Domain> {
    return this.client.request("POST", `/domains/${id}/verify`);
  }

  async delete(id: string): Promise<void> {
    return this.client.request("DELETE", `/domains/${id}`);
  }
}

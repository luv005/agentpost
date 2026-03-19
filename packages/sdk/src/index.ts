import { HttpClient } from "./client.js";
import { Inboxes } from "./resources/inboxes.js";
import { Messages } from "./resources/messages.js";
import { Threads } from "./resources/threads.js";
import { Webhooks } from "./resources/webhooks.js";
import { Domains } from "./resources/domains.js";
import { Attachments } from "./resources/attachments.js";
import type { AgentSendConfig } from "./types.js";

export class AgentSend {
  readonly inboxes: Inboxes;
  readonly messages: Messages;
  readonly threads: Threads;
  readonly webhooks: Webhooks;
  readonly domains: Domains;
  readonly attachments: Attachments;

  constructor(config: AgentSendConfig) {
    const client = new HttpClient(config);
    this.inboxes = new Inboxes(client);
    this.messages = new Messages(client);
    this.threads = new Threads(client);
    this.webhooks = new Webhooks(client);
    this.domains = new Domains(client);
    this.attachments = new Attachments(client);
  }
}

export * from "./types.js";
export * from "./errors.js";

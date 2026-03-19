#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { ApiClient } from "./api-client.js";
import { ensureApiKey } from "./credentials.js";

const BASE_URL =
  process.env.AGENTSEND_BASE_URL ?? "https://agentsend.io";

// Will be initialized in main() after auto-provision
let api: ApiClient;

const server = new Server(
  {
    name: "agentsend-mcp",
    version: "0.1.0",
  },
  {
    capabilities: {
      tools: {},
    },
  },
);

// ── Tool definitions ────────────────────────────────────────────────────────

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "create_inbox",
      description:
        "Create a new email inbox for the AI agent. Returns the inbox address and ID. Use this when you need a new email address to send or receive emails.",
      inputSchema: {
        type: "object" as const,
        properties: {
          displayName: {
            type: "string",
            description: "Display name for the inbox (e.g. 'Support Bot')",
          },
          prefix: {
            type: "string",
            description:
              "Prefix for the email address (e.g. 'support' creates support-xxxx@agentsend.io). If not provided, a random address is generated.",
          },
        },
      },
    },
    {
      name: "list_inboxes",
      description:
        "List all email inboxes for the current account. Returns inbox addresses, IDs, and status.",
      inputSchema: {
        type: "object" as const,
        properties: {},
      },
    },
    {
      name: "send_email",
      description:
        "Send an email from an inbox. Requires inboxId, to addresses, subject, and body. Optionally include threadId to reply in a conversation.",
      inputSchema: {
        type: "object" as const,
        properties: {
          inboxId: {
            type: "string",
            description: "The inbox ID to send from",
          },
          to: {
            type: "array",
            items: { type: "string" },
            description: "Array of recipient email addresses",
          },
          subject: {
            type: "string",
            description: "Email subject line",
          },
          bodyText: {
            type: "string",
            description: "Plain text body of the email",
          },
          bodyHtml: {
            type: "string",
            description: "HTML body of the email (optional, takes precedence over bodyText)",
          },
          cc: {
            type: "array",
            items: { type: "string" },
            description: "CC recipients (optional)",
          },
          threadId: {
            type: "string",
            description:
              "Thread ID to reply in an existing conversation (optional)",
          },
        },
        required: ["inboxId", "to", "subject", "bodyText"],
      },
    },
    {
      name: "list_emails",
      description:
        "List emails for an inbox. Returns recent emails with sender, subject, and status. Use to check for new incoming messages.",
      inputSchema: {
        type: "object" as const,
        properties: {
          inboxId: {
            type: "string",
            description: "The inbox ID to list emails for",
          },
          limit: {
            type: "number",
            description: "Number of emails to return (default 20, max 100)",
          },
          status: {
            type: "string",
            description:
              "Filter by status: queued, sending, sent, delivered, failed, bounced, received",
          },
        },
        required: ["inboxId"],
      },
    },
    {
      name: "get_email",
      description:
        "Get the full content of a specific email by its ID. Returns subject, body, headers, attachments, and thread info.",
      inputSchema: {
        type: "object" as const,
        properties: {
          messageId: {
            type: "string",
            description: "The message ID to retrieve",
          },
        },
        required: ["messageId"],
      },
    },
    {
      name: "list_threads",
      description:
        "List conversation threads for an inbox. Threads group related emails together (replies, forwards).",
      inputSchema: {
        type: "object" as const,
        properties: {
          inboxId: {
            type: "string",
            description: "The inbox ID to list threads for",
          },
          limit: {
            type: "number",
            description: "Number of threads to return (default 20)",
          },
        },
        required: ["inboxId"],
      },
    },
    {
      name: "get_thread",
      description:
        "Get all messages in a conversation thread. Returns the full email chain in chronological order.",
      inputSchema: {
        type: "object" as const,
        properties: {
          threadId: {
            type: "string",
            description: "The thread ID to retrieve",
          },
        },
        required: ["threadId"],
      },
    },
    {
      name: "register_webhook",
      description:
        "Register a webhook URL to receive real-time notifications when emails arrive. Returns the webhook ID and secret for signature verification.",
      inputSchema: {
        type: "object" as const,
        properties: {
          url: {
            type: "string",
            description: "The URL to POST webhook events to",
          },
          events: {
            type: "array",
            items: { type: "string" },
            description:
              "Events to subscribe to: message.received, message.sent, message.delivered, message.bounced, message.complained (default: message.received)",
          },
        },
        required: ["url"],
      },
    },
  ],
}));

// ── Tool execution ──────────────────────────────────────────────────────────

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case "create_inbox": {
        const result = await api.post("/inboxes", {
          displayName: args?.displayName,
          prefix: args?.prefix,
        });
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case "list_inboxes": {
        const result = await api.get("/inboxes");
        return {
          content: [
            { type: "text" as const, text: JSON.stringify(result, null, 2) },
          ],
        };
      }

      case "send_email": {
        const result = await api.post(
          `/inboxes/${args?.inboxId}/messages`,
          {
            to: args?.to,
            subject: args?.subject,
            bodyText: args?.bodyText,
            bodyHtml: args?.bodyHtml,
            cc: args?.cc,
            threadId: args?.threadId,
          },
        );
        return {
          content: [
            { type: "text" as const, text: JSON.stringify(result, null, 2) },
          ],
        };
      }

      case "list_emails": {
        const params = new URLSearchParams();
        if (args?.limit) params.set("limit", String(args.limit));
        if (args?.status) params.set("status", String(args.status));
        const qs = params.toString();
        const result = await api.get(
          `/inboxes/${args?.inboxId}/messages${qs ? `?${qs}` : ""}`,
        );
        return {
          content: [
            { type: "text" as const, text: JSON.stringify(result, null, 2) },
          ],
        };
      }

      case "get_email": {
        const result = await api.get(`/messages/${args?.messageId}`);
        return {
          content: [
            { type: "text" as const, text: JSON.stringify(result, null, 2) },
          ],
        };
      }

      case "list_threads": {
        const params = new URLSearchParams();
        if (args?.limit) params.set("limit", String(args.limit));
        const qs = params.toString();
        const result = await api.get(
          `/inboxes/${args?.inboxId}/threads${qs ? `?${qs}` : ""}`,
        );
        return {
          content: [
            { type: "text" as const, text: JSON.stringify(result, null, 2) },
          ],
        };
      }

      case "get_thread": {
        const result = await api.get(
          `/threads/${args?.threadId}/messages`,
        );
        return {
          content: [
            { type: "text" as const, text: JSON.stringify(result, null, 2) },
          ],
        };
      }

      case "register_webhook": {
        const result = await api.post("/webhooks", {
          url: args?.url,
          events: args?.events,
        });
        return {
          content: [
            { type: "text" as const, text: JSON.stringify(result, null, 2) },
          ],
        };
      }

      default:
        return {
          content: [
            { type: "text" as const, text: `Unknown tool: ${name}` },
          ],
          isError: true,
        };
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      content: [{ type: "text" as const, text: `Error: ${message}` }],
      isError: true,
    };
  }
});

// ── Start ───────────────────────────────────────────────────────────────────

async function main() {
  // Auto-provision: get or create API key (zero config)
  const apiKey = await ensureApiKey(BASE_URL);
  api = new ApiClient(apiKey, BASE_URL);

  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("AgentSend MCP server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});

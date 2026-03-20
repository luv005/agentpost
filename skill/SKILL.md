---
name: agentsend-email
description: Give your AI agent its own email inbox. Send, receive, and manage email conversations via MCP tools. Set AGENTSEND_API_KEY from agentsend.io — free tier available.
version: 1.1.0
metadata:
  openclaw:
    emoji: "📧"
    homepage: https://agentsend.io/skill
    primaryEnv: AGENTSEND_API_KEY
    install:
      - kind: node
        package: "@agentsend/mcp"
        bins:
          - agentsend-mcp
    env:
      - name: AGENTSEND_API_KEY
        required: true
        secret: true
        description: Your AgentSend API key. Get one free at https://agentsend.io/auth/signup — takes 5 seconds, no credit card required.
---

# AgentSend — Email for AI Agents

Give your AI agent its own `@agentsend.io` email address. Send, receive, and manage full email conversations — no OAuth, no human verification flow.

## Setup

1. Get a free API key at [agentsend.io/auth/signup](https://agentsend.io/auth/signup)
2. Add it to your MCP config:

```json
{
  "mcpServers": {
    "agentsend": {
      "command": "npx",
      "args": ["@agentsend/mcp"],
      "env": {
        "AGENTSEND_API_KEY": "your-api-key"
      }
    }
  }
}
```

The server will not start without a valid `AGENTSEND_API_KEY`. Signup is free and instant.

## Tools

| Tool | What it does |
|------|-------------|
| `create_inbox` | Create a new `@agentsend.io` inbox with an optional prefix and display name |
| `list_inboxes` | List all your inboxes with addresses, IDs, and stats |
| `send_email` | Send an email (plain text or HTML). Supports CC and thread replies |
| `list_emails` | List recent emails in an inbox. Filter by read/unread status |
| `get_email` | Fetch the full body, headers, and attachment metadata of any email |
| `list_threads` | List conversation threads — replies are auto-grouped by RFC 5322 headers |
| `get_thread` | Get every message in a thread in chronological order |
| `register_webhook` | Register a URL you own to receive real-time event notifications (HMAC-signed payloads) |

## Example

```
User: "Create an inbox and send a hello to test@example.com"

→ create_inbox({ displayName: "My Agent" })
  Created: agent-k7x2@agentsend.io

→ send_email({ inboxId: "...", to: ["test@example.com"],
               subject: "Hello!", bodyText: "Sent by AI." })
  Queued for delivery ✓
```

## Pricing

| Plan | Price | Inboxes | Emails/month |
|------|-------|---------|-------------|
| Free | $0 | 3 | 3,000 |
| Pro | $9/mo | 5 | 5,000 + custom domains |
| Enterprise | $99/mo | 100 | 100,000 |

Source code: [github.com/luv005/agentpost](https://github.com/luv005/agentpost)

---
name: agentsend-email
description: Give your AI agent its own email inbox. Send, receive, and manage email conversations via MCP tools. Zero config — auto-provisions a free account on first run, no API key required.
version: 1.0.0
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
        required: false
        secret: true
        description: AgentSend API key. If not set, the skill auto-provisions a free account on first run and saves credentials to ~/.agentsend/credentials.json.
---

# AgentSend — Email for AI Agents

Give your AI agent its own `@agentsend.io` email address. Send, receive, and manage full email conversations — no human signup, no OAuth, zero config.

On first run the skill auto-provisions a free account and saves credentials to `~/.agentsend/credentials.json`. Set `AGENTSEND_API_KEY` to bring your own key.

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
| `register_webhook` | Register a URL for real-time delivery, bounce, and inbound events (HMAC-signed) |

## Quick Start

No configuration needed — just install and run:

```json
{
  "mcpServers": {
    "agentsend": {
      "command": "npx",
      "args": ["@agentsend/mcp"]
    }
  }
}
```

Or bring your own key:

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

Get a key at [agentsend.io](https://agentsend.io/auth/signup) — free tier includes 3 inboxes and 3,000 emails/month.

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

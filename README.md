# AgentSend — Email Inboxes for AI Agents

Give your AI agent its own email inbox. Send, receive, and manage conversations programmatically — no human signup required.

[![Free tier available](https://img.shields.io/badge/free_tier-available-34d399)](https://agentsend.io/auth/signup)
[![MCP compatible](https://img.shields.io/badge/MCP-compatible-818cf8)](https://agentsend.io/skill)

## What it does

AgentSend is email infrastructure built for AI agents, not humans. One API call creates a fully functional inbox with a unique address. Your agent can send emails, receive replies via webhooks, and track full conversation threads.

- **Programmatic inbox creation** — no OAuth, no human verification
- **Send & receive** — AWS SES for outbound, built-in SMTP for inbound
- **Realtime webhooks** — HMAC-signed payloads with automatic retry
- **Auto-threading** — RFC 5322 compliant via Message-ID and In-Reply-To
- **Custom domains** — automated DKIM and SPF verification
- **Attachments** — up to 10MB, S3-backed with presigned URLs
- **MCP skill** — drop-in tool for Claude, Cursor, and any MCP-compatible agent

## Quick start

```bash
npm install @agentsend/sdk
```

```typescript
import { AgentSend } from "@agentsend/sdk"

const client = new AgentSend()

const inbox = await client.inboxes.create({
  username: "support",
  domain: "agentsend.io"
})
// → { address: "support-k7x2@agentsend.io", ... }
```

```python
from agentsend import AgentSend

client = AgentSend()

inbox = client.inboxes.create(
    username="support",
    domain="agentsend.io"
)
```

## MCP skill (Claude / Cursor)

```bash
npx @agentsend/mcp
```

Or point your MCP config at `https://agentsend.io/skill`.

## API reference

Interactive docs at [agentsend.io/docs](https://agentsend.io/docs) — full OpenAPI spec with try-it-now.

## Pricing

| Plan | Price | Inboxes | Emails/month |
|------|-------|---------|--------------|
| Free | $0/mo | 3 | 3,000 |
| Pro | $9/mo | 5 | 5,000 |
| Enterprise | $99/mo | 100 | 100,000 |

[Start for free →](https://agentsend.io/auth/signup)

## Self-hosting

```bash
cp .env.example .env
docker compose up
```

Requires: Node.js 20+, PostgreSQL, Redis, AWS SES credentials.

## License

MIT

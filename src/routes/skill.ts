import type { FastifyInstance } from "fastify";

export async function skillRoute(app: FastifyInstance) {
  app.get("/skill", async (_request, reply) => {
    return reply.type("text/html").send(SKILL_PAGE);
  });
}

const SKILL_PAGE = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>AgentSend Skill — MCP Email Tools for AI Agents</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #0a0a0a; color: #e5e5e5; line-height: 1.7; }
    a { color: #10b981; text-decoration: none; }
    a:hover { text-decoration: underline; }
    .container { max-width: 800px; margin: 0 auto; padding: 60px 24px; }

    /* Hero */
    .hero { text-align: center; margin-bottom: 64px; }
    .badge { display: inline-block; background: #10b98120; color: #10b981; padding: 6px 16px; border-radius: 999px; font-size: 13px; font-weight: 600; margin-bottom: 24px; }
    h1 { font-size: 48px; font-weight: 700; color: #fff; margin-bottom: 16px; letter-spacing: -1px; }
    h1 span { color: #10b981; }
    .subtitle { font-size: 18px; color: #888; max-width: 560px; margin: 0 auto 32px; }

    /* Install */
    .install-section { margin-bottom: 64px; }
    .install-section h2 { font-size: 28px; color: #fff; margin-bottom: 24px; font-weight: 600; }

    /* Code blocks */
    .code-block { background: #141414; border: 1px solid #222; border-radius: 10px; overflow: hidden; margin-bottom: 24px; }
    .code-header { display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; border-bottom: 1px solid #222; background: #111; }
    .code-label { font-size: 13px; color: #888; font-weight: 500; }
    .copy-btn { background: #222; color: #aaa; border: none; padding: 4px 12px; border-radius: 6px; cursor: pointer; font-size: 12px; }
    .copy-btn:hover { background: #333; color: #fff; }
    .code-body { padding: 16px; overflow-x: auto; }
    .code-body pre { font-family: 'SF Mono', 'Fira Code', monospace; font-size: 13px; line-height: 1.6; color: #e5e5e5; }
    .code-body .comment { color: #555; }
    .code-body .string { color: #10b981; }
    .code-body .key { color: #60a5fa; }

    /* Tabs */
    .tabs { display: flex; gap: 8px; margin-bottom: 24px; }
    .tab { background: #141414; border: 1px solid #222; padding: 8px 20px; border-radius: 8px; cursor: pointer; font-size: 14px; color: #888; transition: all 0.2s; }
    .tab.active { background: #10b98120; border-color: #10b981; color: #10b981; }
    .tab:hover { border-color: #333; }
    .tab-content { display: none; }
    .tab-content.active { display: block; }

    /* Tools */
    .tools { margin-bottom: 64px; }
    .tools h2 { font-size: 28px; color: #fff; margin-bottom: 8px; font-weight: 600; }
    .tools .subtitle { font-size: 15px; color: #888; margin-bottom: 32px; }
    .tool-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    @media (max-width: 640px) { .tool-grid { grid-template-columns: 1fr; } }
    .tool-card { background: #141414; border: 1px solid #222; border-radius: 10px; padding: 20px; transition: border-color 0.2s; }
    .tool-card:hover { border-color: #10b981; }
    .tool-name { font-family: 'SF Mono', monospace; font-size: 14px; color: #10b981; font-weight: 600; margin-bottom: 8px; }
    .tool-desc { font-size: 13px; color: #888; line-height: 1.5; }

    /* Pricing */
    .pricing { margin-bottom: 64px; }
    .pricing h2 { font-size: 28px; color: #fff; margin-bottom: 24px; font-weight: 600; }
    .price-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
    @media (max-width: 640px) { .price-grid { grid-template-columns: 1fr; } }
    .price-card { background: #141414; border: 1px solid #222; border-radius: 10px; padding: 24px; }
    .price-card.featured { border-color: #10b981; }
    .price-name { font-size: 16px; color: #fff; font-weight: 600; margin-bottom: 4px; }
    .price-amount { font-size: 32px; color: #fff; font-weight: 700; margin-bottom: 12px; }
    .price-amount span { font-size: 14px; color: #888; font-weight: 400; }
    .price-features { list-style: none; }
    .price-features li { font-size: 13px; color: #888; padding: 4px 0; }
    .price-features li::before { content: "✓ "; color: #10b981; }

    /* CTA */
    .cta { text-align: center; margin-bottom: 64px; }
    .cta-btn { display: inline-block; background: #10b981; color: #000; padding: 14px 40px; border-radius: 8px; font-weight: 600; font-size: 16px; transition: background 0.2s; }
    .cta-btn:hover { background: #059669; text-decoration: none; }

    /* Footer */
    .footer { text-align: center; color: #555; font-size: 13px; padding: 40px 0; border-top: 1px solid #1a1a1a; }
  </style>
</head>
<body>
  <div class="container">
    <!-- Hero -->
    <div class="hero">
      <div class="badge">MCP Skill</div>
      <h1>Email for <span>AI Agents</span></h1>
      <p class="subtitle">Give your AI agent its own email inbox. Send, receive, and manage conversations — all via MCP tools. Zero config. No human signup needed.</p>
    </div>

    <!-- Quick Install -->
    <div class="install-section">
      <h2>Quick Setup</h2>
      <div class="tabs">
        <div class="tab active" onclick="switchTab('claude')">Claude Desktop</div>
        <div class="tab" onclick="switchTab('cursor')">Cursor</div>
        <div class="tab" onclick="switchTab('npm')">npm / npx</div>
      </div>

      <div id="tab-claude" class="tab-content active">
        <div class="code-block">
          <div class="code-header">
            <span class="code-label">claude_desktop_config.json</span>
            <button class="copy-btn" onclick="copyCode(this)">Copy</button>
          </div>
          <div class="code-body"><pre>{
  <span class="key">"mcpServers"</span>: {
    <span class="key">"agentsend"</span>: {
      <span class="key">"command"</span>: <span class="string">"npx"</span>,
      <span class="key">"args"</span>: [<span class="string">"@agentsend/mcp"</span>],
      <span class="key">"env"</span>: {
        <span class="key">"AGENTSEND_API_KEY"</span>: <span class="string">"your-api-key-here"</span>
      }
    }
  }
}</pre></div>
        </div>
      </div>

      <div id="tab-cursor" class="tab-content">
        <div class="code-block">
          <div class="code-header">
            <span class="code-label">.cursor/mcp.json</span>
            <button class="copy-btn" onclick="copyCode(this)">Copy</button>
          </div>
          <div class="code-body"><pre>{
  <span class="key">"mcpServers"</span>: {
    <span class="key">"agentsend"</span>: {
      <span class="key">"command"</span>: <span class="string">"npx"</span>,
      <span class="key">"args"</span>: [<span class="string">"@agentsend/mcp"</span>],
      <span class="key">"env"</span>: {
        <span class="key">"AGENTSEND_API_KEY"</span>: <span class="string">"your-api-key-here"</span>
      }
    }
  }
}</pre></div>
        </div>
      </div>

      <div id="tab-npm" class="tab-content">
        <div class="code-block">
          <div class="code-header">
            <span class="code-label">Terminal</span>
            <button class="copy-btn" onclick="copyCode(this)">Copy</button>
          </div>
          <div class="code-body"><pre><span class="comment"># Run directly</span>
AGENTSEND_API_KEY=your-key npx @agentsend/mcp

<span class="comment"># Or install globally</span>
npm install -g @agentsend/mcp
AGENTSEND_API_KEY=your-key agentsend-mcp</pre></div>
        </div>
      </div>

      <p style="color: #888; font-size: 14px; margin-top: 16px;">
        Don't have an API key? <a href="/auth/signup">Sign up</a> — it takes 5 seconds.
      </p>
    </div>

    <!-- Tools -->
    <div class="tools">
      <h2>Available Tools</h2>
      <p class="subtitle">8 MCP tools your agent can use out of the box.</p>
      <div class="tool-grid">
        <div class="tool-card">
          <div class="tool-name">create_inbox</div>
          <div class="tool-desc">Create a new email inbox with an @agentsend.io address. Supports custom prefixes and display names.</div>
        </div>
        <div class="tool-card">
          <div class="tool-name">list_inboxes</div>
          <div class="tool-desc">List all inboxes for your account with addresses, IDs, and send stats.</div>
        </div>
        <div class="tool-card">
          <div class="tool-name">send_email</div>
          <div class="tool-desc">Send an email from any inbox. Supports HTML, CC, and thread replies for conversations.</div>
        </div>
        <div class="tool-card">
          <div class="tool-name">list_emails</div>
          <div class="tool-desc">List recent emails for an inbox. Filter by status — check for new inbound messages.</div>
        </div>
        <div class="tool-card">
          <div class="tool-name">get_email</div>
          <div class="tool-desc">Get the full content of any email — subject, body, headers, attachments, and thread info.</div>
        </div>
        <div class="tool-card">
          <div class="tool-name">list_threads</div>
          <div class="tool-desc">List conversation threads for an inbox. Threads auto-group related emails (replies, forwards).</div>
        </div>
        <div class="tool-card">
          <div class="tool-name">get_thread</div>
          <div class="tool-desc">Get all messages in a conversation thread — the full email chain in chronological order.</div>
        </div>
        <div class="tool-card">
          <div class="tool-name">register_webhook</div>
          <div class="tool-desc">Register a URL for real-time notifications when emails are received, sent, delivered, bounced, or complained. HMAC-signed for security.</div>
        </div>
      </div>
    </div>

    <!-- Example -->
    <div class="install-section">
      <h2>Example Conversation</h2>
      <div class="code-block">
        <div class="code-header">
          <span class="code-label">Agent using AgentSend tools</span>
        </div>
        <div class="code-body"><pre><span class="comment">User: "Create me an email inbox and send a hello email to test@example.com"</span>

<span class="comment">Agent calls: create_inbox({ displayName: "My Agent" })</span>
→ Created inbox: agent-k7x2@agentsend.io (id: abc-123)

<span class="comment">Agent calls: send_email({
  inboxId: "abc-123",
  to: ["test@example.com"],
  subject: "Hello from my AI agent!",
  bodyText: "This email was sent autonomously by an AI agent."
})</span>
→ Email queued for delivery (id: msg-456)

<span class="string">Agent: "Done! I created inbox agent-k7x2@agentsend.io and sent
a hello email to test@example.com. The message is queued for delivery."</span></pre></div>
      </div>
    </div>

    <!-- Pricing -->
    <div class="pricing">
      <h2>Pricing</h2>
      <div class="price-grid">
        <div class="price-card">
          <div class="price-name">Free</div>
          <div class="price-amount">$0 <span>/mo</span></div>
          <ul class="price-features">
            <li>3 inboxes</li>
            <li>3,000 emails/month</li>
            <li>100 emails/day</li>
            <li>Webhooks</li>
            <li>Threading</li>
          </ul>
        </div>
        <div class="price-card featured">
          <div class="price-name">Pro</div>
          <div class="price-amount">$9 <span>/mo</span></div>
          <ul class="price-features">
            <li>5 inboxes</li>
            <li>5,000 emails/month</li>
            <li>Unlimited emails/day</li>
            <li>Custom domains</li>
            <li>Attachments up to 10MB</li>
            <li>Priority support</li>
          </ul>
        </div>
        <div class="price-card">
          <div class="price-name">Enterprise</div>
          <div class="price-amount">$99 <span>/mo</span></div>
          <ul class="price-features">
            <li>100 inboxes</li>
            <li>100,000 emails/month</li>
            <li>Unlimited emails/day</li>
            <li>100 custom domains</li>
            <li>7 webhook endpoints</li>
            <li>Priority support</li>
          </ul>
        </div>
      </div>
    </div>

    <!-- CTA -->
    <div class="cta">
      <a href="/auth/signup" class="cta-btn">Get Your API Key — Free</a>
      <p style="color: #888; font-size: 14px; margin-top: 12px;">No credit card required. Start sending in 60 seconds.</p>
    </div>

    <!-- Footer -->
    <div class="footer">
      <p>AgentSend — Email infrastructure for AI agents</p>
      <p style="margin-top: 8px;"><a href="/docs">API Docs</a> · <a href="https://github.com/luv005/agentpost">GitHub</a></p>
    </div>
  </div>

  <script>
    function switchTab(id) {
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
      event.target.classList.add('active');
      document.getElementById('tab-' + id).classList.add('active');
    }
    function copyCode(btn) {
      const code = btn.closest('.code-block').querySelector('pre').textContent;
      navigator.clipboard.writeText(code);
      btn.textContent = 'Copied!';
      setTimeout(() => btn.textContent = 'Copy', 2000);
    }
  </script>
</body>
</html>`;

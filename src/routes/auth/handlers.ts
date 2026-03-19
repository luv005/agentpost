import type { FastifyRequest, FastifyReply } from "fastify";
import {
  publicSignup,
  sendMagicLink,
  verifyMagicLink,
  getGoogleAuthUrl,
  handleGoogleCallback,
  autoProvision,
} from "../../services/auth.service.js";
import {
  signupBody,
  magicLinkBody,
  verifyQuery,
  googleCallbackQuery,
  autoProvisionBody,
} from "./schemas.js";
import { env } from "../../config/env.js";

/**
 * GET /auth/signup — Signup page with form
 */
export async function signupPage(_request: FastifyRequest, reply: FastifyReply) {
  return reply.type("text/html").send(SIGNUP_PAGE);
}

/**
 * POST /auth/signup — Public signup, returns API key + JWT immediately
 */
export async function signup(request: FastifyRequest, reply: FastifyReply) {
  const body = signupBody.parse(request.body);
  const result = await publicSignup(body.email, body.name);
  return reply.status(201).send(result);
}

/**
 * POST /auth/auto-provision — Zero-friction agent signup
 * No email, no name, just a device ID. Returns API key immediately.
 */
export async function autoProvisionHandler(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const body = autoProvisionBody.parse(request.body);
  const result = await autoProvision(body.deviceId);
  return reply.status(result.isNew ? 201 : 200).send(result);
}

const SIGNUP_PAGE = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Sign Up — AgentSend</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Inter', -apple-system, sans-serif; background: #09090b; color: #e5e5e5; min-height: 100vh; display: flex; align-items: center; justify-content: center; }
    body::before { content: ''; position: fixed; top: 0; left: 0; right: 0; bottom: 0; background-image: linear-gradient(rgba(129,140,248,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(129,140,248,0.03) 1px, transparent 1px); background-size: 64px 64px; pointer-events: none; }
    .card { position: relative; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); border-radius: 20px; padding: 48px 40px; max-width: 440px; width: 100%; margin: 24px; box-shadow: 0 0 80px rgba(129,140,248,0.04); }
    .logo { text-align: center; font-size: 24px; font-weight: 800; color: #fff; margin-bottom: 8px; letter-spacing: -0.5px; }
    .logo span { background: linear-gradient(135deg, #818cf8, #c084fc); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
    .subtitle { text-align: center; color: #52525b; font-size: 14px; margin-bottom: 32px; }
    .google-btn { display: flex; align-items: center; justify-content: center; gap: 10px; width: 100%; padding: 12px; background: #fff; color: #111; border: none; border-radius: 10px; font-size: 14px; font-weight: 600; cursor: pointer; transition: all 0.2s; font-family: inherit; }
    .google-btn:hover { background: #f0f0f0; transform: translateY(-1px); }
    .google-btn svg { width: 18px; height: 18px; }
    .divider { display: flex; align-items: center; gap: 16px; margin: 24px 0; color: #3f3f46; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; }
    .divider::before, .divider::after { content: ''; flex: 1; height: 1px; background: rgba(255,255,255,0.06); }
    label { display: block; font-size: 13px; font-weight: 600; color: #a1a1aa; margin-bottom: 6px; }
    input { width: 100%; padding: 12px 14px; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 10px; color: #fff; font-size: 14px; font-family: inherit; transition: border-color 0.2s; outline: none; }
    input:focus { border-color: rgba(129,140,248,0.5); }
    input::placeholder { color: #3f3f46; }
    .field { margin-bottom: 16px; }
    .submit-btn { width: 100%; padding: 12px; background: #818cf8; color: #fff; border: none; border-radius: 10px; font-size: 14px; font-weight: 600; cursor: pointer; transition: all 0.2s; font-family: inherit; margin-top: 8px; }
    .submit-btn:hover { background: #6366f1; transform: translateY(-1px); box-shadow: 0 0 32px rgba(129,140,248,0.3); }
    .submit-btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
    .result { display: none; margin-top: 24px; background: rgba(52,211,153,0.08); border: 1px solid rgba(52,211,153,0.2); border-radius: 12px; padding: 20px; }
    .result h3 { color: #34d399; font-size: 15px; margin-bottom: 12px; }
    .result .key-box { background: #09090b; border: 1px solid rgba(255,255,255,0.08); border-radius: 8px; padding: 12px; font-family: 'JetBrains Mono', monospace; font-size: 12px; color: #34d399; word-break: break-all; margin-bottom: 8px; cursor: pointer; }
    .result .key-box:hover { border-color: rgba(52,211,153,0.3); }
    .result .hint { color: #52525b; font-size: 12px; }
    .error { display: none; margin-top: 16px; background: rgba(239,68,68,0.08); border: 1px solid rgba(239,68,68,0.2); border-radius: 10px; padding: 12px; color: #ef4444; font-size: 13px; }
    .footer { text-align: center; margin-top: 24px; font-size: 13px; color: #3f3f46; }
    .footer a { color: #818cf8; }
  </style>
</head>
<body>
  <div class="card">
    <div class="logo">Agent<span>Send</span></div>
    <p class="subtitle">Get your API key in 5 seconds</p>

    <a href="/auth/google"><button type="button" class="google-btn">
      <svg viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
      Continue with Google
    </button></a>

    <div class="divider">or</div>

    <form id="signup-form" onsubmit="handleSignup(event)">
      <div class="field">
        <label for="name">Name</label>
        <input type="text" id="name" name="name" placeholder="Your name" required>
      </div>
      <div class="field">
        <label for="email">Email</label>
        <input type="email" id="email" name="email" placeholder="you@example.com" required>
      </div>
      <button type="submit" class="submit-btn" id="submit-btn">Get API Key</button>
    </form>

    <div class="error" id="error"></div>

    <div class="result" id="result">
      <h3>Your API Key</h3>
      <div class="key-box" id="api-key" onclick="navigator.clipboard.writeText(this.textContent);this.style.borderColor='#34d399'"></div>
      <p class="hint">Click to copy. Store it safely — it won't be shown again.</p>
    </div>

    <div class="footer">
      Already have a key? <a href="/docs">Go to docs</a>
    </div>
  </div>

  <script>
    async function handleSignup(e) {
      e.preventDefault();
      const btn = document.getElementById('submit-btn');
      const errEl = document.getElementById('error');
      const resultEl = document.getElementById('result');
      btn.disabled = true;
      btn.textContent = 'Creating...';
      errEl.style.display = 'none';
      resultEl.style.display = 'none';

      try {
        const res = await fetch('/auth/signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: document.getElementById('name').value,
            email: document.getElementById('email').value,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || data.message || 'Signup failed');
        document.getElementById('api-key').textContent = data.apiKey;
        resultEl.style.display = 'block';
        btn.textContent = 'Done!';
      } catch (err) {
        errEl.textContent = err.message;
        errEl.style.display = 'block';
        btn.disabled = false;
        btn.textContent = 'Get API Key';
      }
    }
  </script>
</body>
</html>`;


/**
 * POST /auth/magic-link — Send magic link email
 */
export async function requestMagicLink(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const body = magicLinkBody.parse(request.body);
  await sendMagicLink(body.email);
  return reply.send({ message: "Magic link sent. Check your email." });
}

/**
 * GET /auth/verify?token=xxx — Verify magic link, return JWT
 */
export async function verify(request: FastifyRequest, reply: FastifyReply) {
  const { token } = verifyQuery.parse(request.query);
  const result = await verifyMagicLink(token);

  if (!result) {
    return reply.status(400).send({
      error: "Invalid or expired magic link",
    });
  }

  // Redirect to app with token, or return JSON based on Accept header
  const acceptsJson =
    request.headers.accept?.includes("application/json") ?? false;

  if (acceptsJson) {
    return reply.send({
      account: {
        id: result.account.id,
        name: result.account.name,
        email: result.account.email,
        plan: result.account.plan,
      },
      token: result.token,
    });
  }

  // For browser-based magic link clicks, redirect with token
  const config = env();
  return reply.redirect(
    `${config.APP_URL}/auth/success?token=${result.token}`,
  );
}

/**
 * GET /auth/google — Redirect to Google OAuth
 */
export async function googleAuth(_request: FastifyRequest, reply: FastifyReply) {
  const url = getGoogleAuthUrl();
  return reply.redirect(url);
}

/**
 * GET /auth/google/callback — Handle Google OAuth callback
 */
export async function googleCallback(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const { code } = googleCallbackQuery.parse(request.query);

  try {
    const result = await handleGoogleCallback(code);
    const config = env();

    // Redirect to app with token
    return reply.redirect(
      `${config.APP_URL}/auth/success?token=${result.token}`,
    );
  } catch (error) {
    return reply.status(400).send({
      error: "Google authentication failed",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

/**
 * GET /auth/success — Simple success page that displays the token
 */
export async function authSuccess(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const token = (request.query as Record<string, string>).token ?? "";

  return reply.type("text/html").send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Signed In — AgentSend</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #0a0a0a; color: #fff; display: flex; align-items: center; justify-content: center; min-height: 100vh; }
        .card { background: #141414; border: 1px solid #222; border-radius: 12px; padding: 40px; max-width: 480px; text-align: center; }
        h1 { font-size: 24px; margin-bottom: 12px; }
        p { color: #888; margin-bottom: 24px; line-height: 1.6; }
        .token-box { background: #0a0a0a; border: 1px solid #333; border-radius: 8px; padding: 16px; word-break: break-all; font-family: 'SF Mono', monospace; font-size: 12px; color: #10b981; margin-bottom: 16px; text-align: left; }
        button { background: #fff; color: #000; border: none; padding: 12px 24px; border-radius: 8px; font-weight: 600; cursor: pointer; font-size: 14px; }
        button:hover { background: #e5e5e5; }
        .note { color: #666; font-size: 12px; margin-top: 16px; }
      </style>
    </head>
    <body>
      <div class="card">
        <h1>✓ Signed In</h1>
        <p>You're authenticated. Use this JWT token for API requests:</p>
        <div class="token-box" id="token">${token}</div>
        <button onclick="navigator.clipboard.writeText(document.getElementById('token').textContent)">Copy Token</button>
        <p class="note">Include as: Authorization: Bearer &lt;token&gt;</p>
      </div>
    </body>
    </html>
  `);
}

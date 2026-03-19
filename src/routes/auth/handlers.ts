import type { FastifyRequest, FastifyReply } from "fastify";
import {
  publicSignup,
  sendMagicLink,
  verifyMagicLink,
  getGoogleAuthUrl,
  handleGoogleCallback,
  autoProvision,
  sendVerificationCode,
  verifyCodeAndSignup,
} from "../../services/auth.service.js";
import {
  signupBody,
  magicLinkBody,
  verifyQuery,
  googleCallbackQuery,
  autoProvisionBody,
  sendCodeBody,
  verifyCodeBody,
} from "./schemas.js";
import { env } from "../../config/env.js";

const SESSION_COOKIE_NAME = "agentsend_token";
const SESSION_COOKIE_MAX_AGE_SECONDS = 7 * 24 * 60 * 60;

function buildSessionCookie(token: string): string {
  const config = env();
  const parts = [
    `${SESSION_COOKIE_NAME}=${encodeURIComponent(token)}`,
    "Path=/",
    `Max-Age=${SESSION_COOKIE_MAX_AGE_SECONDS}`,
    "SameSite=Lax",
  ];

  if (config.APP_URL.startsWith("https://")) {
    parts.push("Secure");
  }

  return parts.join("; ");
}

/**
 * GET /auth/signup — Signup page with form
 */
export async function signupPage(_request: FastifyRequest, reply: FastifyReply) {
  return reply.type("text/html").send(SIGNUP_PAGE);
}

/**
 * POST /auth/signup — Public signup, returns account + session token
 */
export async function signup(request: FastifyRequest, reply: FastifyReply) {
  const body = signupBody.parse(request.body);
  const result = await publicSignup(body.email, body.name);
  reply.header("Set-Cookie", buildSessionCookie(result.token));
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

/**
 * POST /auth/send-code — Send 6-digit verification code to email
 */
export async function sendCode(request: FastifyRequest, reply: FastifyReply) {
  const body = sendCodeBody.parse(request.body);
  const result = await sendVerificationCode(body.email, body.name);
  return reply.send(result);
}

/**
 * POST /auth/verify-code — Verify code and create account + session token
 */
export async function verifyCode(request: FastifyRequest, reply: FastifyReply) {
  const body = verifyCodeBody.parse(request.body);
  const result = await verifyCodeAndSignup(body.email, body.code);
  if ("error" in result) {
    return reply.status(400).send({ error: result.error });
  }
  reply.header("Set-Cookie", buildSessionCookie(result.token));
  return reply.status(201).send(result);
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
    .google-btn { display: flex; align-items: center; justify-content: center; gap: 10px; width: 100%; padding: 12px; background: #fff; color: #111; border: none; border-radius: 10px; font-size: 14px; font-weight: 600; cursor: pointer; transition: all 0.2s; font-family: inherit; text-decoration: none; }
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
    .hidden { display: none; }
    .code-input { text-align: center; font-size: 28px; font-weight: 700; letter-spacing: 12px; font-family: 'JetBrains Mono', monospace; }
    .code-sent { text-align: center; color: #a1a1aa; font-size: 13px; margin-bottom: 20px; }
    .code-sent strong { color: #e4e4e7; }
    .result { margin-top: 24px; background: rgba(52,211,153,0.08); border: 1px solid rgba(52,211,153,0.2); border-radius: 12px; padding: 20px; }
    .result h3 { color: #34d399; font-size: 15px; margin-bottom: 12px; }
    .result .success-copy { color: #d4d4d8; font-size: 14px; line-height: 1.6; margin-bottom: 16px; }
    .result .hint { color: #52525b; font-size: 12px; margin-top: 12px; }
    .error { margin-top: 16px; background: rgba(239,68,68,0.08); border: 1px solid rgba(239,68,68,0.2); border-radius: 10px; padding: 12px; color: #ef4444; font-size: 13px; }
    .footer { text-align: center; margin-top: 24px; font-size: 13px; color: #3f3f46; }
    .footer a { color: #818cf8; }
    .back-link { color: #818cf8; cursor: pointer; font-size: 13px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="logo">Agent<span>Send</span></div>
    <p class="subtitle" id="subtitle">Create your AgentSend account</p>

    <!-- Step 1: Email + Name -->
    <div id="step1">
      <a href="/auth/google" class="google-btn">
        <svg viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
        Continue with Google
      </a>
      <div class="divider">or</div>
      <form onsubmit="handleSendCode(event)">
        <div class="field">
          <label for="name">Name</label>
          <input type="text" id="name" placeholder="Your name" required>
        </div>
        <div class="field">
          <label for="email">Email</label>
          <input type="email" id="email" placeholder="you@example.com" required>
        </div>
        <button type="submit" class="submit-btn" id="send-btn">Send Verification Code</button>
      </form>
    </div>

    <!-- Step 2: Enter Code -->
    <div id="step2" class="hidden">
      <p class="code-sent">We sent a 6-digit code to <strong id="sent-email"></strong></p>
      <form onsubmit="handleVerifyCode(event)">
        <div class="field">
          <input type="text" id="code" class="code-input" placeholder="000000" maxlength="6" pattern="[0-9]{6}" required autocomplete="one-time-code">
        </div>
        <button type="submit" class="submit-btn" id="verify-btn">Verify &amp; Continue</button>
      </form>
      <p style="text-align:center;margin-top:12px;"><span class="back-link" onclick="showStep1()">Back</span></p>
    </div>

    <!-- Step 3: Result -->
    <div id="step3" class="hidden">
      <div class="result">
        <h3>You're signed in</h3>
        <p class="success-copy">Your account is ready. You can create API keys later from the dashboard when you need them.</p>
        <button type="button" class="submit-btn" onclick="goToDashboard()">Open Dashboard</button>
        <p class="hint">Redirecting you to the dashboard now.</p>
      </div>
    </div>

    <div id="error" class="error hidden"></div>

    <div class="footer">
      Already have a key? <a href="/docs">Go to docs</a>
    </div>
  </div>

  <script>
    let userEmail = '';
    function persistBrowserSession(token) {
      localStorage.setItem('agentsend_token', token);
      const secure = window.location.protocol === 'https:' ? '; Secure' : '';
      document.cookie = 'agentsend_token=' + encodeURIComponent(token) + '; Path=/; Max-Age=604800; SameSite=Lax' + secure;
    }
    function showError(msg) {
      const el = document.getElementById('error');
      el.textContent = msg;
      el.classList.remove('hidden');
    }
    function hideError() { document.getElementById('error').classList.add('hidden'); }
    function showStep1() {
      document.getElementById('step1').classList.remove('hidden');
      document.getElementById('step2').classList.add('hidden');
      document.getElementById('step3').classList.add('hidden');
      document.getElementById('subtitle').textContent = 'Create your AgentSend account';
      hideError();
    }

    function goToDashboard() {
      window.location.href = '/dashboard?skipOnboarding=1';
    }

    async function handleSendCode(e) {
      e.preventDefault();
      hideError();
      const btn = document.getElementById('send-btn');
      btn.disabled = true; btn.textContent = 'Sending...';
      try {
        const res = await fetch('/auth/send-code', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: document.getElementById('name').value,
            email: document.getElementById('email').value,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to send code');
        userEmail = document.getElementById('email').value;
        document.getElementById('sent-email').textContent = userEmail;
        document.getElementById('step1').classList.add('hidden');
        document.getElementById('step2').classList.remove('hidden');
        document.getElementById('subtitle').textContent = 'Check your email';
        document.getElementById('code').focus();
      } catch (err) {
        showError(err.message);
      } finally {
        btn.disabled = false; btn.textContent = 'Send Verification Code';
      }
    }

    async function handleVerifyCode(e) {
      e.preventDefault();
      hideError();
      const btn = document.getElementById('verify-btn');
      btn.disabled = true; btn.textContent = 'Verifying...';
      try {
        const res = await fetch('/auth/verify-code', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: userEmail,
            code: document.getElementById('code').value,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Verification failed');
        // Save auth to localStorage
        if (data.token) persistBrowserSession(data.token);
        localStorage.removeItem('agentsend_api_key');
        document.getElementById('step2').classList.add('hidden');
        document.getElementById('step3').classList.remove('hidden');
        document.getElementById('subtitle').textContent = 'You\\u2019re in!';
        setTimeout(goToDashboard, 1200);
      } catch (err) {
        showError(err.message);
        btn.disabled = false; btn.textContent = 'Verify & Continue';
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
    reply.header("Set-Cookie", buildSessionCookie(result.token));
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

  // For browser-based magic link clicks, establish the session and go straight to the dashboard.
  reply.header("Set-Cookie", buildSessionCookie(result.token));
  return reply.redirect("/dashboard?skipOnboarding=1");
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
    reply.header("Set-Cookie", buildSessionCookie(result.token));
    return reply.redirect("/dashboard?skipOnboarding=1");
  } catch (error) {
    return reply.status(400).send({
      error: "Google authentication failed",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

/**
 * GET /auth/success — Session handoff page for browser auth flows
 */
export async function authSuccess(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const token = (request.query as Record<string, string>).token ?? "";
  if (token) {
    reply.header("Set-Cookie", buildSessionCookie(token));
  }

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
        button { background: #fff; color: #000; border: none; padding: 12px 24px; border-radius: 8px; font-weight: 600; cursor: pointer; font-size: 14px; }
        button:hover { background: #e5e5e5; }
        .note { color: #666; font-size: 12px; margin-top: 16px; }
      </style>
    </head>
    <body>
      <div class="card">
        <h1>✓ Signed In</h1>
        <p>You're authenticated. We’re sending you to the dashboard now.</p>
        <button id="continue-btn">Continue to Dashboard</button>
        <p class="note">Create API keys later from the dashboard when you actually need one.</p>
      </div>
      <script>
        const token = new URLSearchParams(window.location.search).get('token');
        const destination = '/dashboard?skipOnboarding=1';

        if (token) {
          localStorage.setItem('agentsend_token', token);
          const secure = window.location.protocol === 'https:' ? '; Secure' : '';
          document.cookie = 'agentsend_token=' + encodeURIComponent(token) + '; Path=/; Max-Age=604800; SameSite=Lax' + secure;
          localStorage.removeItem('agentsend_api_key');
        }

        if (window.location.search) {
          history.replaceState(null, '', '/auth/success');
        }

        document.getElementById('continue-btn').addEventListener('click', () => {
          window.location.assign(destination);
        });

        setTimeout(() => {
          window.location.assign(destination);
        }, 1200);
      </script>
    </body>
    </html>
  `);
}

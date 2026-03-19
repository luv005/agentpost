import type { FastifyRequest, FastifyReply } from "fastify";
import {
  publicSignup,
  sendMagicLink,
  verifyMagicLink,
  getGoogleAuthUrl,
  handleGoogleCallback,
} from "../../services/auth.service.js";
import {
  signupBody,
  magicLinkBody,
  verifyQuery,
  googleCallbackQuery,
} from "./schemas.js";
import { env } from "../../config/env.js";

/**
 * POST /auth/signup — Public signup, returns API key + JWT immediately
 */
export async function signup(request: FastifyRequest, reply: FastifyReply) {
  const body = signupBody.parse(request.body);
  const result = await publicSignup(body.email, body.name);
  return reply.status(201).send(result);
}

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

import { randomBytes } from "node:crypto";
import jwt from "jsonwebtoken";
import { OAuth2Client } from "google-auth-library";
import { eq } from "drizzle-orm";
import { getDb } from "../db/client.js";
import { accounts, magicLinks } from "../db/schema.js";
import { createApiKey } from "./api-key.service.js";
import { sendEmail } from "./ses.service.js";
import { env } from "../config/env.js";

// ── JWT ─────────────────────────────────────────────────────────────────────

export interface JwtPayload {
  sub: string; // account ID
  email: string;
}

export function signJwt(accountId: string, email: string): string {
  const config = env();
  const payload: JwtPayload = { sub: accountId, email };
  return jwt.sign(payload as object, config.JWT_SECRET, {
    expiresIn: config.JWT_EXPIRES_IN as string,
  } as jwt.SignOptions);
}

export function verifyJwt(token: string): JwtPayload | null {
  try {
    const config = env();
    return jwt.verify(token, config.JWT_SECRET) as JwtPayload;
  } catch {
    return null;
  }
}

// ── Account creation / lookup ───────────────────────────────────────────────

export async function findOrCreateAccount(data: {
  email: string;
  name: string;
  googleId?: string;
  avatarUrl?: string;
}) {
  const db = getDb();

  // Try to find existing account by email
  const [existing] = await db
    .select()
    .from(accounts)
    .where(eq(accounts.email, data.email.toLowerCase()))
    .limit(1);

  if (existing) {
    // If Google login and no googleId yet, link it
    if (data.googleId && !existing.googleId) {
      await db
        .update(accounts)
        .set({
          googleId: data.googleId,
          avatarUrl: data.avatarUrl,
          updatedAt: new Date(),
        })
        .where(eq(accounts.id, existing.id));
    }
    return existing;
  }

  // Create new account
  const [account] = await db
    .insert(accounts)
    .values({
      name: data.name,
      email: data.email.toLowerCase(),
      googleId: data.googleId ?? null,
      avatarUrl: data.avatarUrl ?? null,
    })
    .returning();

  return account;
}

// ── Verification Code Signup ─────────────────────────────────────────────────

// In-memory store for verification codes (use Redis in production at scale)
const verificationCodes = new Map<
  string,
  { code: string; name: string; email: string; expiresAt: number }
>();

export function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function sendVerificationCode(email: string, name: string) {
  const config = env();
  const code = generateVerificationCode();

  // Store code with 10 min expiry
  verificationCodes.set(email.toLowerCase(), {
    code,
    name,
    email: email.toLowerCase(),
    expiresAt: Date.now() + 10 * 60 * 1000,
  });

  // Send via SES
  await sendEmail({
    from: `AgentSend <noreply@${config.SES_FROM_DOMAIN}>`,
    to: [email],
    subject: `${code} — Your AgentSend verification code`,
    bodyText: `Your verification code is: ${code}\n\nThis code expires in 10 minutes.\n\nIf you didn't request this, ignore this email.`,
    bodyHtml: `
      <div style="font-family: -apple-system, sans-serif; max-width: 400px; margin: 0 auto; padding: 40px 20px; text-align: center;">
        <h2 style="color: #111; margin-bottom: 8px;">Your verification code</h2>
        <div style="font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #111; background: #f4f4f5; padding: 20px; border-radius: 12px; margin: 20px 0;">${code}</div>
        <p style="color: #888; font-size: 14px;">Expires in 10 minutes</p>
      </div>
    `,
  });

  return { sent: true };
}

export async function verifyCodeAndSignup(email: string, code: string) {
  const entry = verificationCodes.get(email.toLowerCase());

  if (!entry) return { error: "No verification code found. Request a new one." };
  if (entry.expiresAt < Date.now()) {
    verificationCodes.delete(email.toLowerCase());
    return { error: "Code expired. Request a new one." };
  }
  if (entry.code !== code) return { error: "Invalid code." };

  // Code is valid — clean up
  verificationCodes.delete(email.toLowerCase());

  // Create account + API key
  const account = await findOrCreateAccount({ email: entry.email, name: entry.name });
  const apiKey = await createApiKey(account.id, "Default API Key");
  const token = signJwt(account.id, account.email);

  return {
    account: {
      id: account.id,
      name: account.name,
      email: account.email,
      plan: account.plan,
    },
    apiKey: apiKey.key,
    token,
  };
}

// Keep old publicSignup for auto-provision (agents don't need email verification)
export async function publicSignup(email: string, name: string) {
  const account = await findOrCreateAccount({ email, name });
  const apiKey = await createApiKey(account.id, "Default API Key");
  const token = signJwt(account.id, account.email);

  return {
    account: {
      id: account.id,
      name: account.name,
      email: account.email,
      plan: account.plan,
    },
    apiKey: apiKey.key,
    token,
  };
}

// ── Auto-Provision (zero-friction agent signup) ─────────────────────────────

export async function autoProvision(deviceId: string) {
  const db = getDb();

  // Check if this device already has an account
  const email = `agent-${deviceId.slice(0, 12)}@agentsend.io`;

  const [existing] = await db
    .select()
    .from(accounts)
    .where(eq(accounts.email, email))
    .limit(1);

  if (existing) {
    // Return existing account — but we need to create a new API key
    // since we can't retrieve the old one (it's hashed)
    const apiKey = await createApiKey(existing.id, "Auto-provisioned");
    return {
      account: {
        id: existing.id,
        email: existing.email,
        plan: existing.plan,
      },
      apiKey: apiKey.key,
      isNew: false,
    };
  }

  // Create new account
  const [account] = await db
    .insert(accounts)
    .values({
      name: `Agent ${deviceId.slice(0, 8)}`,
      email,
    })
    .returning();

  const apiKey = await createApiKey(account.id, "Auto-provisioned");

  return {
    account: {
      id: account.id,
      email: account.email,
      plan: account.plan,
    },
    apiKey: apiKey.key,
    isNew: true,
  };
}

// ── Magic Link ──────────────────────────────────────────────────────────────

export async function sendMagicLink(email: string) {
  const db = getDb();
  const config = env();

  const token = randomBytes(48).toString("hex");
  const expiresAt = new Date(
    Date.now() + config.MAGIC_LINK_EXPIRES_MINUTES * 60 * 1000,
  );

  await db.insert(magicLinks).values({
    email: email.toLowerCase(),
    token,
    expiresAt,
  });

  const verifyUrl = `${config.APP_URL}/auth/verify?token=${token}`;

  // Send via SES
  await sendEmail({
    from: `AgentSend <noreply@${config.SES_FROM_DOMAIN}>`,
    to: [email],
    subject: "Sign in to AgentSend",
    bodyText: `Click this link to sign in to AgentSend:\n\n${verifyUrl}\n\nThis link expires in ${config.MAGIC_LINK_EXPIRES_MINUTES} minutes.\n\nIf you didn't request this, you can safely ignore this email.`,
    bodyHtml: `
      <div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px;">
        <h2 style="color: #111;">Sign in to AgentSend</h2>
        <p style="color: #555; line-height: 1.6;">Click the button below to sign in to your account. This link expires in ${config.MAGIC_LINK_EXPIRES_MINUTES} minutes.</p>
        <a href="${verifyUrl}" style="display: inline-block; padding: 12px 32px; background: #111; color: #fff; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 16px 0;">Sign In</a>
        <p style="color: #999; font-size: 13px;">If you didn't request this, you can safely ignore this email.</p>
      </div>
    `,
  });

  return { sent: true };
}

export async function verifyMagicLink(token: string) {
  const db = getDb();

  const [link] = await db
    .select()
    .from(magicLinks)
    .where(eq(magicLinks.token, token))
    .limit(1);

  if (!link) return null;
  if (link.usedAt) return null;
  if (link.expiresAt < new Date()) return null;

  // Mark as used
  await db
    .update(magicLinks)
    .set({ usedAt: new Date() })
    .where(eq(magicLinks.id, link.id));

  // Find or create account
  const account = await findOrCreateAccount({
    email: link.email,
    name: link.email.split("@")[0],
  });

  const jwtToken = signJwt(account.id, account.email);

  return { account, token: jwtToken };
}

// ── Google OAuth ────────────────────────────────────────────────────────────

let _googleClient: OAuth2Client | null = null;

function getGoogleClient(): OAuth2Client {
  if (_googleClient) return _googleClient;
  const config = env();
  _googleClient = new OAuth2Client(
    config.GOOGLE_CLIENT_ID,
    config.GOOGLE_CLIENT_SECRET,
    config.GOOGLE_REDIRECT_URI,
  );
  return _googleClient;
}

export function getGoogleAuthUrl(): string {
  const client = getGoogleClient();
  return client.generateAuthUrl({
    access_type: "offline",
    scope: ["openid", "email", "profile"],
    prompt: "consent",
  });
}

export async function handleGoogleCallback(code: string) {
  const client = getGoogleClient();
  const { tokens } = await client.getToken(code);
  client.setCredentials(tokens);

  const ticket = await client.verifyIdToken({
    idToken: tokens.id_token!,
    audience: env().GOOGLE_CLIENT_ID,
  });

  const payload = ticket.getPayload();
  if (!payload?.email) throw new Error("Google auth: no email returned");

  const account = await findOrCreateAccount({
    email: payload.email,
    name: payload.name ?? payload.email.split("@")[0],
    googleId: payload.sub,
    avatarUrl: payload.picture,
  });

  const jwtToken = signJwt(account.id, account.email);

  return { account, token: jwtToken };
}

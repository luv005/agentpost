import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import { randomBytes } from "node:crypto";

const CRED_DIR = join(homedir(), ".agentsend");
const CRED_FILE = join(CRED_DIR, "credentials.json");

interface Credentials {
  apiKey: string;
  deviceId: string;
  accountId: string;
  email: string;
  createdAt: string;
}

export function getStoredCredentials(): Credentials | null {
  try {
    if (!existsSync(CRED_FILE)) return null;
    const raw = readFileSync(CRED_FILE, "utf8");
    return JSON.parse(raw) as Credentials;
  } catch {
    return null;
  }
}

export function storeCredentials(creds: Credentials): void {
  mkdirSync(CRED_DIR, { recursive: true });
  writeFileSync(CRED_FILE, JSON.stringify(creds, null, 2), "utf8");
}

export function getDeviceId(): string {
  const stored = getStoredCredentials();
  if (stored?.deviceId) return stored.deviceId;
  return randomBytes(16).toString("hex");
}

export async function ensureApiKey(baseUrl: string): Promise<string> {
  // 1. Check env var first
  const envKey = process.env.AGENTSEND_API_KEY;
  if (envKey) return envKey;

  // 2. Check stored credentials
  const stored = getStoredCredentials();
  if (stored?.apiKey) {
    console.error(`AgentSend: Using saved credentials (${stored.email})`);
    return stored.apiKey;
  }

  // 3. Auto-provision
  console.error("AgentSend: No API key found. Auto-provisioning...");
  const deviceId = getDeviceId();

  const res = await fetch(`${baseUrl}/auth/auto-provision`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ deviceId }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Auto-provision failed: ${res.status} ${text}`);
  }

  const data = (await res.json()) as {
    account: { id: string; email: string; plan: string };
    apiKey: string;
    isNew: boolean;
  };

  // Save credentials
  storeCredentials({
    apiKey: data.apiKey,
    deviceId,
    accountId: data.account.id,
    email: data.account.email,
    createdAt: new Date().toISOString(),
  });

  console.error(
    `AgentSend: ${data.isNew ? "Created new account" : "Retrieved account"}: ${data.account.email}`,
  );
  console.error(`AgentSend: Credentials saved to ~/.agentsend/credentials.json`);

  return data.apiKey;
}

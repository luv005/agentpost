import {
  SESClient,
  SendRawEmailCommand,
  VerifyDomainIdentityCommand,
  VerifyDomainDkimCommand,
  GetIdentityVerificationAttributesCommand,
  DeleteIdentityCommand,
} from "@aws-sdk/client-ses";
import { env } from "../config/env.js";

let _client: SESClient | null = null;

function getClient(): SESClient {
  if (_client) return _client;
  const config = env();
  _client = new SESClient({
    region: config.AWS_REGION,
    ...(config.AWS_ACCESS_KEY_ID && {
      credentials: {
        accessKeyId: config.AWS_ACCESS_KEY_ID,
        secretAccessKey: config.AWS_SECRET_ACCESS_KEY,
      },
    }),
  });
  return _client;
}

export interface EmailAttachment {
  filename: string;
  contentType: string;
  content: Buffer;
}

export interface SendEmailParams {
  from: string;
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  bodyText?: string;
  bodyHtml?: string;
  messageIdHeader?: string;
  inReplyTo?: string;
  references?: string[];
  attachments?: EmailAttachment[];
}

function buildRawEmail(params: SendEmailParams): string {
  const boundary = `----=_Part_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  const lines: string[] = [];

  lines.push(`From: ${params.from}`);
  lines.push(`To: ${params.to.join(", ")}`);
  if (params.cc?.length) lines.push(`Cc: ${params.cc.join(", ")}`);
  lines.push(`Subject: ${params.subject}`);
  if (params.messageIdHeader) lines.push(`Message-ID: ${params.messageIdHeader}`);
  if (params.inReplyTo) lines.push(`In-Reply-To: ${params.inReplyTo}`);
  if (params.references?.length) lines.push(`References: ${params.references.join(" ")}`);
  lines.push("MIME-Version: 1.0");

  const hasAttachments = params.attachments && params.attachments.length > 0;

  if (hasAttachments) {
    // multipart/mixed: body + attachments
    const mixedBoundary = `----=_Mixed_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    lines.push(`Content-Type: multipart/mixed; boundary="${mixedBoundary}"`);
    lines.push("");

    // Body part
    lines.push(`--${mixedBoundary}`);
    if (params.bodyText && params.bodyHtml) {
      lines.push(`Content-Type: multipart/alternative; boundary="${boundary}"`);
      lines.push("");
      lines.push(`--${boundary}`);
      lines.push("Content-Type: text/plain; charset=UTF-8");
      lines.push("");
      lines.push(params.bodyText);
      lines.push(`--${boundary}`);
      lines.push("Content-Type: text/html; charset=UTF-8");
      lines.push("");
      lines.push(params.bodyHtml);
      lines.push(`--${boundary}--`);
    } else if (params.bodyHtml) {
      lines.push("Content-Type: text/html; charset=UTF-8");
      lines.push("");
      lines.push(params.bodyHtml);
    } else {
      lines.push("Content-Type: text/plain; charset=UTF-8");
      lines.push("");
      lines.push(params.bodyText ?? "");
    }

    // Attachment parts
    for (const att of params.attachments!) {
      lines.push(`--${mixedBoundary}`);
      lines.push(`Content-Type: ${att.contentType}; name="${att.filename}"`);
      lines.push("Content-Transfer-Encoding: base64");
      lines.push(`Content-Disposition: attachment; filename="${att.filename}"`);
      lines.push("");
      // Base64 encode and wrap at 76 chars
      const b64 = att.content.toString("base64");
      for (let i = 0; i < b64.length; i += 76) {
        lines.push(b64.slice(i, i + 76));
      }
    }

    lines.push(`--${mixedBoundary}--`);
  } else if (params.bodyText && params.bodyHtml) {
    lines.push(`Content-Type: multipart/alternative; boundary="${boundary}"`);
    lines.push("");
    lines.push(`--${boundary}`);
    lines.push("Content-Type: text/plain; charset=UTF-8");
    lines.push("");
    lines.push(params.bodyText);
    lines.push(`--${boundary}`);
    lines.push("Content-Type: text/html; charset=UTF-8");
    lines.push("");
    lines.push(params.bodyHtml);
    lines.push(`--${boundary}--`);
  } else if (params.bodyHtml) {
    lines.push("Content-Type: text/html; charset=UTF-8");
    lines.push("");
    lines.push(params.bodyHtml);
  } else {
    lines.push("Content-Type: text/plain; charset=UTF-8");
    lines.push("");
    lines.push(params.bodyText ?? "");
  }

  return lines.join("\r\n");
}

export async function sendEmail(params: SendEmailParams): Promise<string> {
  const config = env();

  if (config.SES_DRY_RUN) {
    const fakeId = `dry-run-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    console.log(`[SES DRY RUN] Would send email from ${params.from} to ${params.to.join(", ")} — MessageId: ${fakeId}`);
    return fakeId;
  }

  const client = getClient();
  const rawMessage = buildRawEmail(params);
  const allRecipients = [
    ...params.to,
    ...(params.cc ?? []),
    ...(params.bcc ?? []),
  ];

  const command = new SendRawEmailCommand({
    Source: params.from,
    Destinations: allRecipients,
    RawMessage: { Data: Buffer.from(rawMessage) },
  });

  const response = await client.send(command);
  return response.MessageId ?? "unknown";
}

// ── Domain Verification ───────────────────────────────────────────────────

export async function verifyDomainIdentity(domain: string): Promise<string> {
  const config = env();
  if (config.SES_DRY_RUN) {
    console.log(`[SES DRY RUN] Would verify domain: ${domain}`);
    return `dry-run-token-${Date.now()}`;
  }
  const client = getClient();
  const response = await client.send(
    new VerifyDomainIdentityCommand({ Domain: domain }),
  );
  return response.VerificationToken ?? "";
}

export async function verifyDomainDkim(domain: string): Promise<string[]> {
  const config = env();
  if (config.SES_DRY_RUN) {
    console.log(`[SES DRY RUN] Would verify DKIM for: ${domain}`);
    return ["dkim-token-1", "dkim-token-2", "dkim-token-3"];
  }
  const client = getClient();
  const response = await client.send(
    new VerifyDomainDkimCommand({ Domain: domain }),
  );
  return response.DkimTokens ?? [];
}

export async function getIdentityVerificationAttributes(
  domain: string,
): Promise<{ verificationStatus: string; dkimVerified: boolean }> {
  const config = env();
  if (config.SES_DRY_RUN) {
    return { verificationStatus: "Success", dkimVerified: true };
  }
  const client = getClient();
  const response = await client.send(
    new GetIdentityVerificationAttributesCommand({ Identities: [domain] }),
  );
  const attrs = response.VerificationAttributes?.[domain];
  return {
    verificationStatus: attrs?.VerificationStatus ?? "NotStarted",
    dkimVerified: false, // DKIM status checked separately
  };
}

export async function deleteIdentity(domain: string): Promise<void> {
  const config = env();
  if (config.SES_DRY_RUN) {
    console.log(`[SES DRY RUN] Would delete identity: ${domain}`);
    return;
  }
  const client = getClient();
  await client.send(new DeleteIdentityCommand({ Identity: domain }));
}

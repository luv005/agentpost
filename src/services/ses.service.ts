import { SESClient, SendRawEmailCommand } from "@aws-sdk/client-ses";
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

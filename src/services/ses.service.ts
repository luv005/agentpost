import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";
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
}

export async function sendEmail(params: SendEmailParams): Promise<string> {
  const config = env();

  if (config.SES_DRY_RUN) {
    const fakeId = `dry-run-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    console.log(`[SES DRY RUN] Would send email from ${params.from} to ${params.to.join(", ")} — MessageId: ${fakeId}`);
    return fakeId;
  }

  const client = getClient();
  const command = new SendEmailCommand({
    Source: params.from,
    Destination: {
      ToAddresses: params.to,
      CcAddresses: params.cc,
      BccAddresses: params.bcc,
    },
    Message: {
      Subject: { Data: params.subject },
      Body: {
        ...(params.bodyText && { Text: { Data: params.bodyText } }),
        ...(params.bodyHtml && { Html: { Data: params.bodyHtml } }),
      },
    },
  });

  const response = await client.send(command);
  return response.MessageId ?? "unknown";
}

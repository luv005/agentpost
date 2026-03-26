import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { env } from "../config/env.js";
import { enqueueInbound } from "../queue/inbound.queue.js";

/**
 * SES Receipt Notification from SNS.
 * When SES receives an inbound email, it stores it in S3 and sends
 * this notification via SNS.
 */
export interface SesReceiptNotification {
  notificationType: "Received";
  receipt: {
    action: {
      type: "S3";
      bucketName: string;
      objectKey: string;
    };
    recipients: string[];
    timestamp: string;
    processingTimeMillis: number;
    spamVerdict: { status: string };
    virusVerdict: { status: string };
    spfVerdict: { status: string };
    dkimVerdict: { status: string };
    dmarcVerdict: { status: string };
  };
  mail: {
    messageId: string;
    source: string;
    destination: string[];
    timestamp: string;
    commonHeaders: {
      from: string[];
      to: string[];
      subject: string;
      messageId: string;
    };
  };
}

let _s3Client: S3Client | null = null;

function getS3Client(): S3Client {
  if (_s3Client) return _s3Client;
  const config = env();
  _s3Client = new S3Client({
    region: config.AWS_REGION,
    ...(config.AWS_ACCESS_KEY_ID && {
      credentials: {
        accessKeyId: config.AWS_ACCESS_KEY_ID,
        secretAccessKey: config.AWS_SECRET_ACCESS_KEY,
      },
    }),
  });
  return _s3Client;
}

export async function processSesInbound(
  event: SesReceiptNotification,
): Promise<void> {
  const { receipt, mail } = event;

  // Skip spam/virus emails
  if (receipt.spamVerdict.status === "FAIL") {
    console.warn(`Rejecting spam email from ${mail.source}: ${mail.messageId}`);
    return;
  }
  if (receipt.virusVerdict.status === "FAIL") {
    console.warn(
      `Rejecting virus email from ${mail.source}: ${mail.messageId}`,
    );
    return;
  }

  // Download raw email from S3
  const { bucketName, objectKey } = receipt.action;
  const client = getS3Client();

  const response = await client.send(
    new GetObjectCommand({
      Bucket: bucketName,
      Key: objectKey,
    }),
  );

  const stream = response.Body;
  if (!stream) {
    throw new Error(`Empty S3 response for inbound email: ${objectKey}`);
  }

  const chunks: Uint8Array[] = [];
  for await (const chunk of stream as AsyncIterable<Uint8Array>) {
    chunks.push(chunk);
  }
  const rawEmail = Buffer.concat(chunks);
  const rawEmailBase64 = rawEmail.toString("base64");

  // Enqueue for each recipient (reuse existing inbound worker)
  for (const recipient of receipt.recipients) {
    await enqueueInbound({
      rawEmail: rawEmailBase64,
      recipientAddress: recipient.toLowerCase(),
    });

    console.log(
      `SES inbound email enqueued: messageId=${mail.messageId} recipient=${recipient}`,
    );
  }
}

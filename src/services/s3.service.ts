import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { env } from "../config/env.js";

let _client: S3Client | null = null;

function getClient(): S3Client {
  if (_client) return _client;
  const config = env();
  _client = new S3Client({
    region: config.S3_REGION,
    ...(config.AWS_ACCESS_KEY_ID && {
      credentials: {
        accessKeyId: config.AWS_ACCESS_KEY_ID,
        secretAccessKey: config.AWS_SECRET_ACCESS_KEY,
      },
    }),
  });
  return _client;
}

export async function uploadAttachment(
  key: string,
  body: Buffer,
  contentType: string,
): Promise<void> {
  const client = getClient();
  const config = env();

  await client.send(
    new PutObjectCommand({
      Bucket: config.S3_BUCKET,
      Key: key,
      Body: body,
      ContentType: contentType,
    }),
  );
}

export async function getAttachmentUrl(
  key: string,
  expiresInSeconds = 3600,
): Promise<string> {
  const client = getClient();
  const config = env();

  const url = await getSignedUrl(
    client,
    new GetObjectCommand({ Bucket: config.S3_BUCKET, Key: key }),
    { expiresIn: expiresInSeconds },
  );

  return url;
}

export async function downloadAttachment(key: string): Promise<Buffer> {
  const client = getClient();
  const config = env();

  const response = await client.send(
    new GetObjectCommand({ Bucket: config.S3_BUCKET, Key: key }),
  );

  const stream = response.Body;
  if (!stream) throw new Error(`Empty S3 response for key: ${key}`);

  // Convert stream to Buffer
  const chunks: Uint8Array[] = [];
  for await (const chunk of stream as AsyncIterable<Uint8Array>) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

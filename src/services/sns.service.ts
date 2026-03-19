import { createVerify } from "node:crypto";

export interface SnsMessage {
  Type: "SubscriptionConfirmation" | "Notification" | "UnsubscribeConfirmation";
  MessageId: string;
  TopicArn: string;
  Message: string;
  Timestamp: string;
  SignatureVersion?: string;
  Signature?: string;
  SigningCertURL?: string;
  Subject?: string;
  Token?: string;
  SubscribeURL?: string;
}

const CERT_CACHE = new Map<string, string>();
const SNS_HOST_PATTERN = /^sns\.[a-z0-9-]+\.amazonaws\.com(\.cn)?$/i;

function isTrustedSigningCertUrl(urlString: string): boolean {
  try {
    const url = new URL(urlString);
    return (
      url.protocol === "https:" &&
      !url.search &&
      !url.hash &&
      SNS_HOST_PATTERN.test(url.hostname) &&
      url.pathname.endsWith(".pem")
    );
  } catch {
    return false;
  }
}

function buildSigningString(message: SnsMessage): string {
  const fieldNames =
    message.Type === "Notification"
      ? [
          "Message",
          "MessageId",
          ...(message.Subject ? ["Subject"] : []),
          "Timestamp",
          "TopicArn",
          "Type",
        ]
      : [
          "Message",
          "MessageId",
          "SubscribeURL",
          "Timestamp",
          "Token",
          "TopicArn",
          "Type",
        ];

  let payload = "";
  for (const fieldName of fieldNames) {
    const value = message[fieldName as keyof SnsMessage];
    if (typeof value !== "string" || value.length === 0) {
      throw new Error(`Missing SNS signing field: ${fieldName}`);
    }
    payload += `${fieldName}\n${value}\n`;
  }

  return payload;
}

async function getSigningCertificate(signingCertUrl: string): Promise<string> {
  const cached = CERT_CACHE.get(signingCertUrl);
  if (cached) return cached;

  const response = await fetch(signingCertUrl);
  if (!response.ok) {
    throw new Error(
      `Unable to fetch SNS signing certificate: ${response.status}`,
    );
  }

  const certificate = await response.text();
  CERT_CACHE.set(signingCertUrl, certificate);
  return certificate;
}

export async function validateSnsMessageSignature(
  message: SnsMessage,
): Promise<boolean> {
  if (
    !message.SignatureVersion ||
    !message.Signature ||
    !message.SigningCertURL
  ) {
    return false;
  }

  if (!isTrustedSigningCertUrl(message.SigningCertURL)) {
    return false;
  }

  const algorithm =
    message.SignatureVersion === "1"
      ? "RSA-SHA1"
      : message.SignatureVersion === "2"
        ? "RSA-SHA256"
        : null;

  if (!algorithm) {
    return false;
  }

  const signingString = buildSigningString(message);
  const certificate = await getSigningCertificate(message.SigningCertURL);
  const verifier = createVerify(algorithm);
  verifier.update(signingString, "utf8");
  verifier.end();

  return verifier.verify(certificate, message.Signature, "base64");
}

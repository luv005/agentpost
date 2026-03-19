import { simpleParser, type ParsedMail } from "mailparser";

export interface ParsedEmail {
  messageId: string | undefined;
  inReplyTo: string | undefined;
  references: string[];
  from: string;
  to: string[];
  cc: string[];
  subject: string;
  bodyText: string | undefined;
  bodyHtml: string | undefined;
  attachments: {
    filename: string;
    contentType: string;
    size: number;
    content: Buffer;
  }[];
  rawHeaders: Record<string, string>;
}

function extractAddresses(
  value: ParsedMail["from"],
): string[] {
  if (!value) return [];
  if ("value" in value) {
    return value.value.map((a) => a.address).filter(Boolean) as string[];
  }
  return [];
}

export async function parseEmail(rawEmail: Buffer): Promise<ParsedEmail> {
  const parsed = await simpleParser(rawEmail);

  const references: string[] = [];
  if (parsed.references) {
    if (Array.isArray(parsed.references)) {
      references.push(...parsed.references);
    } else {
      references.push(parsed.references);
    }
  }

  const rawHeaders: Record<string, string> = {};
  if (parsed.headers) {
    for (const [key, value] of parsed.headers) {
      rawHeaders[key] = typeof value === "string" ? value : String(value);
    }
  }

  return {
    messageId: parsed.messageId,
    inReplyTo: parsed.inReplyTo
      ? (Array.isArray(parsed.inReplyTo)
          ? parsed.inReplyTo[0]
          : parsed.inReplyTo)
      : undefined,
    references,
    from: extractAddresses(parsed.from)[0] ?? "unknown@unknown.com",
    to: extractAddresses(parsed.to as ParsedMail["from"]),
    cc: extractAddresses(parsed.cc as ParsedMail["from"]),
    subject: parsed.subject ?? "(no subject)",
    bodyText: parsed.text,
    bodyHtml: parsed.html || undefined,
    attachments: (parsed.attachments ?? []).map((a) => ({
      filename: a.filename ?? "attachment",
      contentType: a.contentType,
      size: a.size,
      content: a.content,
    })),
    rawHeaders,
  };
}

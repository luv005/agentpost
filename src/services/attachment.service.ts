import { eq, and, inArray } from "drizzle-orm";
import { nanoid } from "nanoid";
import { getDb } from "../db/client.js";
import { attachments } from "../db/schema.js";
import { uploadAttachment as s3Upload, getAttachmentUrl, downloadAttachment as s3Download } from "./s3.service.js";
import { NotFoundError, AppError } from "../lib/errors.js";
import { env } from "../config/env.js";

export async function upload(
  accountId: string,
  file: { filename: string; mimetype: string; data: Buffer },
) {
  const config = env();

  if (file.data.length > config.MAX_ATTACHMENT_SIZE_BYTES) {
    throw new AppError(
      "ATTACHMENT_TOO_LARGE",
      `Attachment exceeds maximum size of ${config.MAX_ATTACHMENT_SIZE_BYTES} bytes`,
      400,
    );
  }

  const key = `outbound/${accountId}/${nanoid(16)}/${file.filename}`;
  await s3Upload(key, file.data, file.mimetype);

  const db = getDb();
  const [attachment] = await db
    .insert(attachments)
    .values({
      accountId,
      key,
      filename: file.filename,
      contentType: file.mimetype,
      size: file.data.length,
    })
    .returning();

  return attachment;
}

export async function getAttachment(attachmentId: string, accountId: string) {
  const db = getDb();
  const [attachment] = await db
    .select()
    .from(attachments)
    .where(
      and(eq(attachments.id, attachmentId), eq(attachments.accountId, accountId)),
    )
    .limit(1);

  if (!attachment) throw new NotFoundError("Attachment", attachmentId);

  const url = await getAttachmentUrl(attachment.key);
  return { ...attachment, url };
}

export async function getAttachmentsByIds(
  attachmentIds: string[],
  accountId: string,
) {
  if (attachmentIds.length === 0) return [];

  const db = getDb();
  const rows = await db
    .select()
    .from(attachments)
    .where(
      and(
        inArray(attachments.id, attachmentIds),
        eq(attachments.accountId, accountId),
      ),
    );

  if (rows.length !== attachmentIds.length) {
    const found = new Set(rows.map((r) => r.id));
    const missing = attachmentIds.filter((id) => !found.has(id));
    throw new NotFoundError("Attachment", missing.join(", "));
  }

  return rows;
}

export async function downloadAttachmentContent(key: string): Promise<Buffer> {
  return s3Download(key);
}

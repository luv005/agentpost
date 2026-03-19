import type { FastifyRequest, FastifyReply } from "fastify";
import * as attachmentService from "../../services/attachment.service.js";
import { attachmentParams } from "./schemas.js";

export async function uploadAttachment(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const data = await request.file();
  if (!data) {
    return reply.status(400).send({ error: "No file uploaded" });
  }

  const chunks: Buffer[] = [];
  for await (const chunk of data.file) {
    chunks.push(chunk);
  }
  const buffer = Buffer.concat(chunks);

  const attachment = await attachmentService.upload(request.account.id, {
    filename: data.filename,
    mimetype: data.mimetype,
    data: buffer,
  });

  return reply.status(201).send(attachment);
}

export async function downloadAttachment(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const { id } = attachmentParams.parse(request.params);
  const attachment = await attachmentService.getAttachment(
    id,
    request.account.id,
  );
  return reply.send(attachment);
}

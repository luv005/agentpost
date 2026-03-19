import type { FastifyRequest, FastifyReply } from "fastify";
import * as messageService from "../../services/message.service.js";
import {
  sendMessageBody,
  sendMessageParams,
  listMessagesParams,
  listMessagesQuery,
  messageIdParams,
} from "./schemas.js";

export async function sendMessage(request: FastifyRequest, reply: FastifyReply) {
  const { inboxId } = sendMessageParams.parse(request.params);
  const body = sendMessageBody.parse(request.body);

  const message = await messageService.sendMessage({
    inboxId,
    accountId: request.account.id,
    to: body.to,
    cc: body.cc,
    bcc: body.bcc,
    subject: body.subject,
    bodyText: body.bodyText,
    bodyHtml: body.bodyHtml,
    threadId: body.threadId,
  });

  return reply.status(202).send(message);
}

export async function listMessages(request: FastifyRequest, reply: FastifyReply) {
  const { inboxId } = listMessagesParams.parse(request.params);
  const query = listMessagesQuery.parse(request.query);

  const result = await messageService.listMessages(
    inboxId,
    request.account.id,
    query,
  );
  return reply.send(result);
}

export async function getMessage(request: FastifyRequest, reply: FastifyReply) {
  const { id } = messageIdParams.parse(request.params);
  const message = await messageService.getMessage(id, request.account.id);
  return reply.send(message);
}

export async function deleteMessage(request: FastifyRequest, reply: FastifyReply) {
  const { id } = messageIdParams.parse(request.params);
  await messageService.deleteMessage(id, request.account.id);
  return reply.status(204).send();
}

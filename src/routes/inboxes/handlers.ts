import type { FastifyRequest, FastifyReply } from "fastify";
import * as inboxService from "../../services/inbox.service.js";
import { createInboxBody, listInboxesQuery, inboxParams } from "./schemas.js";

export async function createInbox(request: FastifyRequest, reply: FastifyReply) {
  const body = createInboxBody.parse(request.body);
  const inbox = await inboxService.createInbox(
    request.account.id,
    body.displayName,
    body.domainId,
  );
  return reply.status(201).send(inbox);
}

export async function listInboxes(request: FastifyRequest, reply: FastifyReply) {
  const query = listInboxesQuery.parse(request.query);
  const result = await inboxService.listInboxes(request.account.id, query);
  return reply.send(result);
}

export async function getInbox(request: FastifyRequest, reply: FastifyReply) {
  const { id } = inboxParams.parse(request.params);
  const inbox = await inboxService.getInbox(id, request.account.id);
  return reply.send(inbox);
}

export async function deleteInbox(request: FastifyRequest, reply: FastifyReply) {
  const { id } = inboxParams.parse(request.params);
  await inboxService.deleteInbox(id, request.account.id);
  return reply.status(204).send();
}

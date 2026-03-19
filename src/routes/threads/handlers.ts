import type { FastifyRequest, FastifyReply } from "fastify";
import * as threadService from "../../services/thread.service.js";
import { threadParams, inboxThreadsParams, listQuery } from "./schemas.js";

export async function listThreads(request: FastifyRequest, reply: FastifyReply) {
  const { id: inboxId } = inboxThreadsParams.parse(request.params);
  const query = listQuery.parse(request.query);
  const result = await threadService.listThreads(
    inboxId,
    request.account.id,
    query,
  );
  return reply.send(result);
}

export async function getThread(request: FastifyRequest, reply: FastifyReply) {
  const { id } = threadParams.parse(request.params);
  const thread = await threadService.getThread(id, request.account.id);
  return reply.send(thread);
}

export async function getThreadMessages(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const { id } = threadParams.parse(request.params);
  const query = listQuery.parse(request.query);
  const result = await threadService.getThreadMessages(
    id,
    request.account.id,
    query,
  );
  return reply.send(result);
}

import type { FastifyRequest, FastifyReply } from "fastify";
import * as webhookService from "../../services/webhook.service.js";
import {
  createWebhookBody,
  updateWebhookBody,
  webhookParams,
} from "./schemas.js";

export async function createWebhook(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const body = createWebhookBody.parse(request.body);
  const webhook = await webhookService.createWebhook(
    request.account.id,
    body.url,
    body.events,
  );
  return reply.status(201).send(webhook);
}

export async function listWebhooks(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const webhookList = await webhookService.listWebhooks(request.account.id);
  return reply.send({ data: webhookList });
}

export async function getWebhook(request: FastifyRequest, reply: FastifyReply) {
  const { id } = webhookParams.parse(request.params);
  const webhook = await webhookService.getWebhook(id, request.account.id);
  // Don't expose the secret on GET
  const { secret: _, ...safe } = webhook;
  return reply.send(safe);
}

export async function updateWebhook(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const { id } = webhookParams.parse(request.params);
  const body = updateWebhookBody.parse(request.body);
  const webhook = await webhookService.updateWebhook(
    id,
    request.account.id,
    body,
  );
  const { secret: _, ...safe } = webhook;
  return reply.send(safe);
}

export async function deleteWebhook(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const { id } = webhookParams.parse(request.params);
  await webhookService.deleteWebhook(id, request.account.id);
  return reply.status(204).send();
}

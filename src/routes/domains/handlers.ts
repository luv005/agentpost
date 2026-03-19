import type { FastifyRequest, FastifyReply } from "fastify";
import * as domainService from "../../services/domain.service.js";
import { addDomainBody, domainParams, listDomainsQuery } from "./schemas.js";

export async function addDomain(request: FastifyRequest, reply: FastifyReply) {
  const body = addDomainBody.parse(request.body);
  const domain = await domainService.addDomain(request.account.id, body.domain);
  return reply.status(201).send(domain);
}

export async function listDomains(request: FastifyRequest, reply: FastifyReply) {
  const query = listDomainsQuery.parse(request.query);
  const result = await domainService.listDomains(request.account.id, query);
  return reply.send(result);
}

export async function getDomain(request: FastifyRequest, reply: FastifyReply) {
  const { id } = domainParams.parse(request.params);
  const domain = await domainService.getDomain(id, request.account.id);
  return reply.send(domain);
}

export async function verifyDomain(request: FastifyRequest, reply: FastifyReply) {
  const { id } = domainParams.parse(request.params);
  const domain = await domainService.verifyDomain(id, request.account.id);
  return reply.send(domain);
}

export async function deleteDomain(request: FastifyRequest, reply: FastifyReply) {
  const { id } = domainParams.parse(request.params);
  await domainService.deleteDomain(id, request.account.id);
  return reply.status(204).send();
}

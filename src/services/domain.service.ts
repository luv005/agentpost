import { eq, and, sql } from "drizzle-orm";
import { getDb } from "../db/client.js";
import { domains } from "../db/schema.js";
import * as ses from "./ses.service.js";
import { AppError, NotFoundError } from "../lib/errors.js";

export interface DnsRecord {
  type: string;
  name: string;
  value: string;
}

function buildDnsRecords(
  domain: string,
  verificationToken: string,
  dkimTokens: string[],
): DnsRecord[] {
  const records: DnsRecord[] = [
    {
      type: "TXT",
      name: `_amazonses.${domain}`,
      value: verificationToken,
    },
  ];

  for (const token of dkimTokens) {
    records.push({
      type: "CNAME",
      name: `${token}._domainkey.${domain}`,
      value: `${token}.dkim.amazonses.com`,
    });
  }

  return records;
}

export async function addDomain(accountId: string, domainName: string) {
  const db = getDb();

  // Check for duplicate
  const [existing] = await db
    .select()
    .from(domains)
    .where(and(eq(domains.accountId, accountId), eq(domains.domain, domainName)))
    .limit(1);

  if (existing) {
    throw new AppError("DOMAIN_EXISTS", "Domain already registered", 409);
  }

  // Call SES to initiate verification
  const verificationToken = await ses.verifyDomainIdentity(domainName);
  const dkimTokens = await ses.verifyDomainDkim(domainName);

  const [domain] = await db
    .insert(domains)
    .values({
      accountId,
      domain: domainName,
      verificationToken,
      dkimTokens,
    })
    .returning();

  return {
    ...domain,
    dnsRecords: buildDnsRecords(domainName, verificationToken, dkimTokens),
  };
}

export async function listDomains(
  accountId: string,
  opts: { limit?: number; offset?: number } = {},
) {
  const db = getDb();
  const limit = opts.limit ?? 20;
  const offset = opts.offset ?? 0;

  const rows = await db
    .select()
    .from(domains)
    .where(eq(domains.accountId, accountId))
    .limit(limit)
    .offset(offset);

  const [countResult] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(domains)
    .where(eq(domains.accountId, accountId));

  return { data: rows, total: countResult.count };
}

export async function getDomain(domainId: string, accountId: string) {
  const db = getDb();
  const [domain] = await db
    .select()
    .from(domains)
    .where(and(eq(domains.id, domainId), eq(domains.accountId, accountId)))
    .limit(1);

  if (!domain) throw new NotFoundError("Domain", domainId);

  return {
    ...domain,
    dnsRecords: buildDnsRecords(
      domain.domain,
      domain.verificationToken ?? "",
      (domain.dkimTokens as string[]) ?? [],
    ),
  };
}

export async function verifyDomain(domainId: string, accountId: string) {
  const db = getDb();
  const [domain] = await db
    .select()
    .from(domains)
    .where(and(eq(domains.id, domainId), eq(domains.accountId, accountId)))
    .limit(1);

  if (!domain) throw new NotFoundError("Domain", domainId);

  const attrs = await ses.getIdentityVerificationAttributes(domain.domain);

  const isVerified = attrs.verificationStatus === "Success";

  if (isVerified && domain.verificationStatus !== "verified") {
    await db
      .update(domains)
      .set({
        verificationStatus: "verified",
        verifiedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(domains.id, domainId));
  } else if (!isVerified && domain.verificationStatus === "pending") {
    await db
      .update(domains)
      .set({
        verificationStatus: "pending",
        updatedAt: new Date(),
      })
      .where(eq(domains.id, domainId));
  }

  return getDomain(domainId, accountId);
}

export async function deleteDomain(domainId: string, accountId: string) {
  const db = getDb();
  const [domain] = await db
    .select()
    .from(domains)
    .where(and(eq(domains.id, domainId), eq(domains.accountId, accountId)))
    .limit(1);

  if (!domain) throw new NotFoundError("Domain", domainId);

  // Remove from SES
  await ses.deleteIdentity(domain.domain);

  // Delete from DB
  await db.delete(domains).where(eq(domains.id, domainId));

  return domain;
}

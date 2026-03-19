import { eq, and, isNull, sql, desc } from "drizzle-orm";
import { getDb } from "../db/client.js";
import { inboxes, domains } from "../db/schema.js";
import { generateEmailAddress, generateEmailLocal } from "../lib/email-address.js";
import { NotFoundError, InboxSuspendedError, AppError } from "../lib/errors.js";
import { env } from "../config/env.js";

const INBOX_LOCAL_PART_REGEX = /^[a-z0-9](?:[a-z0-9._-]{0,62}[a-z0-9])?$/;

export function normalizeInboxAddress(
  requestedAddress: string,
  expectedDomain: string,
): string {
  const normalizedAddress = requestedAddress.trim().toLowerCase();
  const parts = normalizedAddress.split("@");

  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    throw new AppError(
      "INVALID_INBOX_ADDRESS",
      "Inbox address must be a valid email address",
      400,
    );
  }

  const [localPart, domain] = parts;
  const normalizedDomain = expectedDomain.trim().toLowerCase();

  if (domain !== normalizedDomain) {
    throw new AppError(
      "INVALID_INBOX_DOMAIN",
      `Inbox address must use @${normalizedDomain}`,
      400,
    );
  }

  if (!INBOX_LOCAL_PART_REGEX.test(localPart)) {
    throw new AppError(
      "INVALID_INBOX_LOCAL_PART",
      "Inbox username can only contain letters, numbers, dots, underscores, and hyphens.",
      400,
    );
  }

  return `${localPart}@${normalizedDomain}`;
}

export async function createInbox(
  accountId: string,
  displayName?: string,
  domainId?: string,
  requestedAddress?: string,
) {
  const db = getDb();
  let address: string;
  let domainName: string | undefined;

  if (domainId) {
    // Use custom domain
    const [domain] = await db
      .select()
      .from(domains)
      .where(and(eq(domains.id, domainId), eq(domains.accountId, accountId)))
      .limit(1);

    if (!domain) throw new NotFoundError("Domain", domainId);
    if (domain.verificationStatus !== "verified") {
      throw new AppError("DOMAIN_NOT_VERIFIED", "Domain is not yet verified", 400);
    }

    domainName = domain.domain;
  }

  if (requestedAddress) {
    address = normalizeInboxAddress(
      requestedAddress,
      domainName ?? env().SES_FROM_DOMAIN,
    );
  } else if (domainName) {
    address = `${generateEmailLocal()}@${domainName}`;
  } else {
    address = generateEmailAddress();
  }

  const [inbox] = await db
    .insert(inboxes)
    .values({
      accountId,
      domainId: domainId ?? null,
      address,
      displayName: displayName ?? null,
    })
    .returning();

  return inbox;
}

export async function listInboxes(
  accountId: string,
  opts: { limit?: number; offset?: number } = {},
) {
  const db = getDb();
  const limit = opts.limit ?? 20;
  const offset = opts.offset ?? 0;

  const rows = await db
    .select()
    .from(inboxes)
    .where(
      and(
        eq(inboxes.accountId, accountId),
        eq(inboxes.status, "active"),
        isNull(inboxes.deletedAt),
      ),
    )
    .orderBy(desc(inboxes.createdAt))
    .limit(limit)
    .offset(offset);

  const [countResult] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(inboxes)
    .where(
      and(
        eq(inboxes.accountId, accountId),
        eq(inboxes.status, "active"),
        isNull(inboxes.deletedAt),
      ),
    );

  return { data: rows, total: countResult.count };
}

export async function getInbox(inboxId: string, accountId: string) {
  const db = getDb();

  const [inbox] = await db
    .select()
    .from(inboxes)
    .where(
      and(
        eq(inboxes.id, inboxId),
        eq(inboxes.accountId, accountId),
        isNull(inboxes.deletedAt),
      ),
    )
    .limit(1);

  if (!inbox) throw new NotFoundError("Inbox", inboxId);
  return inbox;
}

export async function getActiveInbox(inboxId: string, accountId: string) {
  const inbox = await getInbox(inboxId, accountId);
  if (inbox.status === "suspended") throw new InboxSuspendedError(inboxId);
  return inbox;
}

export async function deleteInbox(inboxId: string, accountId: string) {
  const db = getDb();

  const [inbox] = await db
    .update(inboxes)
    .set({ deletedAt: new Date(), status: "deleted", updatedAt: new Date() })
    .where(
      and(
        eq(inboxes.id, inboxId),
        eq(inboxes.accountId, accountId),
        isNull(inboxes.deletedAt),
      ),
    )
    .returning();

  if (!inbox) throw new NotFoundError("Inbox", inboxId);
  return inbox;
}

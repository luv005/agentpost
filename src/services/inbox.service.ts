import { eq, and, isNull, sql, desc } from "drizzle-orm";
import { getDb } from "../db/client.js";
import { inboxes, domains } from "../db/schema.js";
import { generateEmailAddress, generateEmailLocal } from "../lib/email-address.js";
import { NotFoundError, InboxSuspendedError, AppError } from "../lib/errors.js";

export async function createInbox(
  accountId: string,
  displayName?: string,
  domainId?: string,
) {
  const db = getDb();
  let address: string;

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

    address = `${generateEmailLocal()}@${domain.domain}`;
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

import {
  pgTable,
  uuid,
  varchar,
  integer,
  boolean,
  text,
  jsonb,
  timestamp,
  index,
} from "drizzle-orm/pg-core";

// ── Accounts ────────────────────────────────────────────────────────────────

export const accounts = pgTable("accounts", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  plan: varchar("plan", { length: 50 }).notNull().default("free"),
  dailySendLimit: integer("daily_send_limit").notNull().default(100),
  isVerified: boolean("is_verified").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ── API Keys ────────────────────────────────────────────────────────────────

export const apiKeys = pgTable(
  "api_keys",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    accountId: uuid("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    keyPrefix: varchar("key_prefix", { length: 12 }).notNull(),
    keyHash: varchar("key_hash", { length: 128 }).notNull().unique(),
    name: varchar("name", { length: 255 }),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("api_keys_account_id_idx").on(table.accountId)],
);

// ── Inboxes ─────────────────────────────────────────────────────────────────

export const inboxes = pgTable(
  "inboxes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    accountId: uuid("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    address: varchar("address", { length: 255 }).notNull().unique(),
    displayName: varchar("display_name", { length: 255 }),
    dailySendLimit: integer("daily_send_limit").notNull().default(10),
    isVerified: boolean("is_verified").notNull().default(false),
    sendsToday: integer("sends_today").notNull().default(0),
    bounceCount: integer("bounce_count").notNull().default(0),
    complaintCount: integer("complaint_count").notNull().default(0),
    status: varchar("status", { length: 20 }).notNull().default("active"),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("inboxes_account_id_idx").on(table.accountId),
    index("inboxes_account_status_idx").on(table.accountId, table.status),
  ],
);

// ── Messages ────────────────────────────────────────────────────────────────

export type MessageAttachment = {
  key: string;
  filename: string;
  contentType: string;
  size: number;
};

export const messages = pgTable(
  "messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    inboxId: uuid("inbox_id")
      .notNull()
      .references(() => inboxes.id, { onDelete: "cascade" }),
    accountId: uuid("account_id")
      .notNull()
      .references(() => accounts.id),
    direction: varchar("direction", { length: 10 })
      .notNull()
      .default("outbound"),
    fromAddress: varchar("from_address", { length: 255 }).notNull(),
    toAddresses: jsonb("to_addresses").notNull().$type<string[]>(),
    ccAddresses: jsonb("cc_addresses").$type<string[]>().default([]),
    bccAddresses: jsonb("bcc_addresses").$type<string[]>().default([]),
    subject: text("subject").notNull(),
    bodyText: text("body_text"),
    bodyHtml: text("body_html"),
    attachments: jsonb("attachments")
      .$type<MessageAttachment[]>()
      .default([]),
    status: varchar("status", { length: 20 }).notNull().default("queued"),
    sesMessageId: varchar("ses_message_id", { length: 255 }),
    errorMessage: text("error_message"),
    retryCount: integer("retry_count").notNull().default(0),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("messages_inbox_created_idx").on(table.inboxId, table.createdAt),
    index("messages_account_created_idx").on(
      table.accountId,
      table.createdAt,
    ),
    index("messages_status_idx").on(table.status),
  ],
);

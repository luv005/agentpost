// ── Config ─────────────────────────────────────────────────────────────────

export interface AgentSendConfig {
  apiKey: string;
  baseUrl?: string;
  maxRetries?: number;
  retryDelay?: number;
  timeout?: number;
}

// ── Common ─────────────────────────────────────────────────────────────────

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
}

export interface PaginationParams {
  limit?: number;
  offset?: number;
}

// ── Inboxes ────────────────────────────────────────────────────────────────

export interface Inbox {
  id: string;
  accountId: string;
  domainId: string | null;
  address: string;
  displayName: string | null;
  dailySendLimit: number;
  isVerified: boolean;
  sendsToday: number;
  bounceCount: number;
  complaintCount: number;
  totalSent: number;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateInboxParams {
  displayName?: string;
  domainId?: string;
}

// ── Messages ───────────────────────────────────────────────────────────────

export interface MessageAttachment {
  key: string;
  filename: string;
  contentType: string;
  size: number;
}

export interface Message {
  id: string;
  inboxId: string;
  accountId: string;
  threadId: string | null;
  direction: string;
  fromAddress: string;
  toAddresses: string[];
  ccAddresses: string[];
  bccAddresses: string[];
  subject: string;
  bodyText: string | null;
  bodyHtml: string | null;
  attachments: MessageAttachment[];
  status: string;
  sesMessageId: string | null;
  messageIdHeader: string | null;
  inReplyTo: string | null;
  referencesHeaders: string[];
  sentAt: string | null;
  createdAt: string;
}

export interface SendMessageParams {
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  bodyText?: string;
  bodyHtml?: string;
  threadId?: string;
  attachmentIds?: string[];
}

export interface ListMessagesParams extends PaginationParams {
  status?: string;
}

// ── Threads ────────────────────────────────────────────────────────────────

export interface Thread {
  id: string;
  inboxId: string;
  accountId: string;
  subject: string;
  lastMessageAt: string;
  messageCount: number;
  createdAt: string;
}

// ── Webhooks ───────────────────────────────────────────────────────────────

export interface Webhook {
  id: string;
  url: string;
  events: string[];
  isActive: boolean;
  secret?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateWebhookParams {
  url: string;
  events?: string[];
}

export interface UpdateWebhookParams {
  url?: string;
  events?: string[];
  isActive?: boolean;
}

// ── Domains ────────────────────────────────────────────────────────────────

export interface DnsRecord {
  type: string;
  name: string;
  value: string;
}

export interface Domain {
  id: string;
  domain: string;
  verificationStatus: string;
  dkimTokens: string[];
  verificationToken: string | null;
  dnsRecords?: DnsRecord[];
  verifiedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AddDomainParams {
  domain: string;
}

// ── Attachments ────────────────────────────────────────────────────────────

export interface Attachment {
  id: string;
  filename: string;
  contentType: string;
  size: number;
  url?: string;
  createdAt: string;
}

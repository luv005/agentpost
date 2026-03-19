import { Queue } from "bullmq";
import { getRedisConnection } from "./connection.js";

export interface EmailJobData {
  messageId: string;
  messageIdHeader?: string;
  inReplyTo?: string;
  references?: string[];
  from: string;
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  bodyText?: string;
  bodyHtml?: string;
  inboxId: string;
}

let _queue: Queue<EmailJobData> | null = null;

export function getEmailQueue(): Queue<EmailJobData> {
  if (_queue) return _queue;
  _queue = new Queue<EmailJobData>("email-send", {
    connection: getRedisConnection(),
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: "exponential", delay: 30000 },
      removeOnComplete: { count: 1000 },
      removeOnFail: { count: 5000 },
    },
  });
  return _queue;
}

export async function enqueueEmail(data: EmailJobData): Promise<string> {
  const queue = getEmailQueue();
  const job = await queue.add("send", data);
  return job.id!;
}

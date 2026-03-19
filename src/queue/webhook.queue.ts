import { Queue } from "bullmq";
import { getRedisConnection } from "./connection.js";
import { env } from "../config/env.js";

export interface WebhookJobData {
  webhookId: string;
  url: string;
  secret: string;
  event: string;
  payload: Record<string, unknown>;
}

let _queue: Queue | null = null;

function getWebhookQueue(): Queue {
  if (_queue) return _queue;
  const config = env();
  _queue = new Queue("webhook-delivery", {
    connection: getRedisConnection(),
    defaultJobOptions: {
      attempts: config.WEBHOOK_MAX_RETRIES,
      backoff: { type: "exponential", delay: config.WEBHOOK_RETRY_DELAY_MS },
      removeOnComplete: { count: 2000 },
      removeOnFail: { count: 5000 },
    },
  });
  return _queue;
}

export async function enqueueWebhook(data: WebhookJobData): Promise<string> {
  const queue = getWebhookQueue();
  const job = await queue.add("deliver", data);
  return job.id!;
}

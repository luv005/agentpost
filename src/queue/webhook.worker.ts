import { Worker, Job } from "bullmq";
import { getRedisConnection } from "./connection.js";
import { signPayload } from "../services/webhook.service.js";
import { env } from "../config/env.js";
import type { WebhookJobData } from "./webhook.queue.js";

async function processWebhookJob(job: Job<WebhookJobData>) {
  const { url, secret, event, payload, webhookId } = job.data;
  const config = env();

  const body = JSON.stringify({ event, data: payload, timestamp: Date.now() });
  const signature = signPayload(body, secret);

  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    config.WEBHOOK_TIMEOUT_MS,
  );

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-AgentSend-Event": event,
        "X-AgentSend-Signature": signature,
        "X-AgentSend-Webhook-Id": webhookId,
      },
      body,
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(
        `Webhook delivery failed: ${response.status} ${response.statusText}`,
      );
    }

    console.log(`Webhook delivered: ${webhookId} -> ${url} (${event})`);
  } finally {
    clearTimeout(timeout);
  }
}

export function startWebhookWorker(): Worker<WebhookJobData> {
  const worker = new Worker<WebhookJobData>(
    "webhook-delivery",
    processWebhookJob,
    {
      connection: getRedisConnection(),
      concurrency: 5,
    },
  );

  worker.on("completed", (job) => {
    console.log(`Webhook job ${job.id} completed`);
  });

  worker.on("failed", (job, error) => {
    console.error(`Webhook job ${job?.id} failed:`, error.message);
  });

  return worker;
}

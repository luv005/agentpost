import { Queue } from "bullmq";
import { getRedisConnection } from "./connection.js";

export interface InboundJobData {
  rawEmail: string; // base64 encoded
  recipientAddress: string;
}

let _queue: Queue | null = null;

function getInboundQueue(): Queue {
  if (_queue) return _queue;
  _queue = new Queue("inbound-email", {
    connection: getRedisConnection(),
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: "exponential", delay: 5000 },
      removeOnComplete: { count: 1000 },
      removeOnFail: { count: 5000 },
    },
  });
  return _queue;
}

export async function enqueueInbound(data: InboundJobData): Promise<string> {
  const queue = getInboundQueue();
  const job = await queue.add("process", data);
  return job.id!;
}

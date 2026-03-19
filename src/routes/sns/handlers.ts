import type { FastifyRequest, FastifyReply } from "fastify";
import { processSesEvent, type SesNotification } from "../../services/ses-event.service.js";
import { env } from "../../config/env.js";
import {
  validateSnsMessageSignature,
  type SnsMessage,
} from "../../services/sns.service.js";

export async function handleSnsNotification(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const body = request.body as SnsMessage;

  if (!body?.Type) {
    return reply.status(400).send({ error: "Invalid SNS message" });
  }

  const isValidSignature = await validateSnsMessageSignature(body);
  if (!isValidSignature) {
    return reply.status(403).send({ error: "Invalid SNS signature" });
  }

  // Validate topic ARN if configured
  const config = env();
  if (config.SNS_TOPIC_ARN && body.TopicArn !== config.SNS_TOPIC_ARN) {
    console.warn(`SNS topic ARN mismatch: ${body.TopicArn}`);
    return reply.status(403).send({ error: "Invalid topic" });
  }

  switch (body.Type) {
    case "SubscriptionConfirmation": {
      if (!body.SubscribeURL) {
        return reply.status(400).send({ error: "Missing SubscribeURL" });
      }

      // Auto-confirm the subscription
      try {
        await fetch(body.SubscribeURL);
        console.log(`SNS subscription confirmed: ${body.TopicArn}`);
        return reply.status(200).send({ status: "confirmed" });
      } catch (err) {
        console.error("Failed to confirm SNS subscription:", err);
        return reply.status(500).send({ error: "Confirmation failed" });
      }
    }

    case "Notification": {
      try {
        const sesEvent: SesNotification = JSON.parse(body.Message);
        await processSesEvent(sesEvent);
        return reply.status(200).send({ status: "processed" });
      } catch (err) {
        console.error("Failed to process SES event:", err);
        return reply.status(500).send({ error: "Processing failed" });
      }
    }

    case "UnsubscribeConfirmation": {
      console.log(`SNS unsubscribe confirmation: ${body.TopicArn}`);
      return reply.status(200).send({ status: "ok" });
    }

    default:
      return reply.status(400).send({ error: "Unknown message type" });
  }
}

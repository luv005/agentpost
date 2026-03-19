import { loadEnv } from "./config/env.js";

const config = loadEnv();

const { buildApp } = await import("./app.js");
const { startEmailWorker } = await import("./queue/email.worker.js");
const { startInboundWorker } = await import("./queue/inbound.worker.js");
const { startWebhookWorker } = await import("./queue/webhook.worker.js");
const { startSmtpServer } = await import("./smtp/server.js");

const app = await buildApp();

try {
  await app.listen({ port: config.PORT, host: config.HOST });

  const emailWorker = startEmailWorker();
  const inboundWorker = startInboundWorker();
  const webhookWorker = startWebhookWorker();
  const smtpServer = await startSmtpServer();

  app.log.info("Email worker started");
  app.log.info("Inbound worker started");
  app.log.info("Webhook worker started");
  app.log.info(`SMTP server listening on ${config.SMTP_HOST}:${config.SMTP_PORT}`);

  // Graceful shutdown
  const shutdown = async () => {
    app.log.info("Shutting down...");
    smtpServer.close();
    await emailWorker.close();
    await inboundWorker.close();
    await webhookWorker.close();
    await app.close();
    process.exit(0);
  };

  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
} catch (err) {
  app.log.error(err);
  process.exit(1);
}

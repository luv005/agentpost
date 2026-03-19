import { loadEnv } from "./config/env.js";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

const config = loadEnv();

// Run migrations before anything else
try {
  console.log("Running database migrations...");
  const migrationSql = postgres(config.DATABASE_URL, { max: 1 });
  const migrationDb = drizzle(migrationSql);
  await migrate(migrationDb, { migrationsFolder: "./src/db/migrations" });
  await migrationSql.end();
  console.log("Migrations complete.");
} catch (err) {
  console.error("Migration failed:", err);
  // Don't exit — tables might already exist
}

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

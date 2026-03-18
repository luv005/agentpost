import { loadEnv } from "./config/env.js";

const config = loadEnv();

const { buildApp } = await import("./app.js");
const { startEmailWorker } = await import("./queue/email.worker.js");

const app = await buildApp();

try {
  await app.listen({ port: config.PORT, host: config.HOST });
  const worker = startEmailWorker();
  app.log.info("Email worker started");

  // Graceful shutdown
  const shutdown = async () => {
    app.log.info("Shutting down...");
    await worker.close();
    await app.close();
    process.exit(0);
  };

  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
} catch (err) {
  app.log.error(err);
  process.exit(1);
}

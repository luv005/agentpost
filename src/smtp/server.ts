import { SMTPServer } from "smtp-server";
import { eq } from "drizzle-orm";
import { env } from "../config/env.js";
import { getDb } from "../db/client.js";
import { inboxes } from "../db/schema.js";
import { enqueueInbound } from "../queue/inbound.queue.js";

export function createSmtpServer(): SMTPServer {
  const config = env();

  const server = new SMTPServer({
    authOptional: true,
    disabledCommands: ["AUTH"],
    size: config.SMTP_MAX_SIZE,
    onRcptTo(address, _session, callback) {
      // Verify recipient exists in our inboxes
      const recipientAddress = address.address.toLowerCase();
      const db = getDb();

      db.select({ id: inboxes.id })
        .from(inboxes)
        .where(eq(inboxes.address, recipientAddress))
        .limit(1)
        .then((rows) => {
          if (rows.length === 0) {
            return callback(
              new Error(`Mailbox not found: ${recipientAddress}`),
            );
          }
          callback();
        })
        .catch((err) => {
          console.error("SMTP onRcptTo error:", err);
          callback(new Error("Internal server error"));
        });
    },
    onData(stream, session, callback) {
      const chunks: Buffer[] = [];

      stream.on("data", (chunk: Buffer) => {
        chunks.push(chunk);
      });

      stream.on("end", () => {
        const rawEmail = Buffer.concat(chunks);

        // Get all recipient addresses from this session
        const recipients = session.envelope.rcptTo.map((r) =>
          r.address.toLowerCase(),
        );

        // Enqueue for async processing
        for (const recipient of recipients) {
          enqueueInbound({
            rawEmail: rawEmail.toString("base64"),
            recipientAddress: recipient,
          }).catch((err) => {
            console.error("Failed to enqueue inbound email:", err);
          });
        }

        callback();
      });

      stream.on("error", (err) => {
        console.error("SMTP stream error:", err);
        callback(new Error("Error processing email"));
      });
    },
  });

  return server;
}

export function startSmtpServer(): Promise<SMTPServer> {
  const config = env();
  const server = createSmtpServer();

  return new Promise((resolve, reject) => {
    server.listen(config.SMTP_PORT, config.SMTP_HOST, () => {
      console.log(
        `SMTP server listening on ${config.SMTP_HOST}:${config.SMTP_PORT}`,
      );
      resolve(server);
    });

    server.on("error", (err) => {
      console.error("SMTP server error:", err);
      reject(err);
    });
  });
}

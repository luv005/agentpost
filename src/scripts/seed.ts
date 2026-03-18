import { loadEnv } from "../config/env.js";
loadEnv();

import { getDb } from "../db/client.js";
import { accounts } from "../db/schema.js";
import { createApiKey } from "../services/api-key.service.js";

async function seed() {
  const db = getDb();

  // Create a test account
  const [account] = await db
    .insert(accounts)
    .values({
      name: "Test Account",
      email: "test@agentsend.io",
      isVerified: true,
      dailySendLimit: 1000,
    })
    .returning();

  console.log("Created account:", account.id);

  // Create an API key
  const apiKey = await createApiKey(account.id, "development");
  console.log("Created API key:", apiKey.key);
  console.log("\nSave this key — it won't be shown again!");

  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});

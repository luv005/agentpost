import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { env } from "../config/env.js";
import * as schema from "./schema.js";

let _db: ReturnType<typeof drizzle<typeof schema>> | null = null;

export function getDb() {
  if (_db) return _db;
  const sql = postgres(env().DATABASE_URL);
  _db = drizzle(sql, { schema });
  return _db;
}

export type Db = ReturnType<typeof getDb>;

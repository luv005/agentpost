import { Redis } from "ioredis";
import { env } from "../config/env.js";

let _connection: Redis | null = null;

export function getRedisConnection(): Redis {
  if (_connection) return _connection;
  _connection = new Redis(env().REDIS_URL, { maxRetriesPerRequest: null });
  return _connection;
}

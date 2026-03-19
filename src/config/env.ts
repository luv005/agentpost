import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  PORT: z.coerce.number().default(3000),
  HOST: z.string().default("0.0.0.0"),
  LOG_LEVEL: z
    .enum(["fatal", "error", "warn", "info", "debug", "trace"])
    .default("info"),

  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().default("redis://localhost:6379"),

  AWS_REGION: z.string().default("us-east-1"),
  AWS_ACCESS_KEY_ID: z.string().default(""),
  AWS_SECRET_ACCESS_KEY: z.string().default(""),
  SES_FROM_DOMAIN: z.string().default("agentsend.io"),
  SES_DRY_RUN: z
    .string()
    .transform((v) => v === "true")
    .default("true"),

  S3_BUCKET: z.string().default("agentpost-attachments"),
  S3_REGION: z.string().default("us-east-1"),

  RATE_LIMIT_GLOBAL_MAX: z.coerce.number().default(100),
  RATE_LIMIT_GLOBAL_WINDOW_MS: z.coerce.number().default(60000),
  DEFAULT_INBOX_DAILY_LIMIT: z.coerce.number().default(10),
  VERIFIED_INBOX_DAILY_LIMIT: z.coerce.number().default(1000),

  MAX_BOUNCE_RATE: z.coerce.number().default(0.05),
  MAX_COMPLAINT_RATE: z.coerce.number().default(0.001),
  MAX_ATTACHMENT_SIZE_BYTES: z.coerce.number().default(10485760),

  EMAIL_QUEUE_CONCURRENCY: z.coerce.number().default(5),
  EMAIL_QUEUE_MAX_RETRIES: z.coerce.number().default(3),
  EMAIL_QUEUE_RETRY_DELAY_MS: z.coerce.number().default(30000),

  SMTP_PORT: z.coerce.number().default(2525),
  SMTP_HOST: z.string().default("0.0.0.0"),
  SMTP_MAX_SIZE: z.coerce.number().default(26214400),

  WEBHOOK_MAX_RETRIES: z.coerce.number().default(5),
  WEBHOOK_RETRY_DELAY_MS: z.coerce.number().default(10000),
  WEBHOOK_TIMEOUT_MS: z.coerce.number().default(30000),
});

export type Env = z.infer<typeof envSchema>;

let _env: Env | null = null;

export function loadEnv(): Env {
  if (_env) return _env;
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    console.error("Invalid environment variables:");
    console.error(result.error.flatten().fieldErrors);
    process.exit(1);
  }
  _env = result.data;
  return _env;
}

export function env(): Env {
  if (!_env) return loadEnv();
  return _env;
}

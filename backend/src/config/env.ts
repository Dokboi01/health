import "dotenv/config";

import { z } from "zod";

const booleanEnvSchema = z.enum(["true", "false"]).default("false").transform((value) => value === "true");

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  API_PREFIX: z.string().trim().default("/api/v1"),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required."),
  CORS_ORIGIN: z.string().default("http://localhost:3000"),
  JWT_ACCESS_SECRET: z.string().min(32, "JWT_ACCESS_SECRET must be at least 32 characters."),
  JWT_REFRESH_SECRET: z.string().min(32, "JWT_REFRESH_SECRET must be at least 32 characters."),
  JWT_ACCESS_EXPIRES_IN: z.string().default("15m"),
  JWT_REFRESH_EXPIRES_IN: z.string().default("7d"),
  PASSWORD_RESET_EXPIRES_IN: z.string().default("30m"),
  BCRYPT_SALT_ROUNDS: z.coerce.number().int().min(10).max(15).default(12),
  FCM_ENABLED: booleanEnvSchema,
  FCM_PROJECT_ID: z.string().trim().optional(),
  FCM_CLIENT_EMAIL: z.string().trim().optional(),
  FCM_PRIVATE_KEY: z.string().optional(),
  REMINDER_DISPATCH_ENABLED: booleanEnvSchema,
  REMINDER_DISPATCH_INTERVAL_MS: z.coerce.number().int().min(10_000).max(3_600_000).default(60_000),
  REMINDER_DISPATCH_BATCH_SIZE: z.coerce.number().int().min(1).max(500).default(50),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Invalid environment configuration", parsed.error.flatten().fieldErrors);
  throw new Error("Environment validation failed.");
}

export const env = parsed.data;

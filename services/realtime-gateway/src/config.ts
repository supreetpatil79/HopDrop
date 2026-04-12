import dotenv from 'dotenv';
import path from 'path';
import { z } from 'zod';

[
  path.resolve(process.cwd(), '../../.env'),
  path.resolve(process.cwd(), '.env')
].forEach((envPath) => {
  dotenv.config({ path: envPath, override: false });
});

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(5002),
  FRONTEND_URL: z.string().default('http://localhost'),
  REDIS_URL: z.string().optional(),
  REDIS_CACHE_URL: z.string().optional(),
  JWT_ACCESS_SECRET: z.string().min(64),
  REALTIME_EVENT_CHANNEL: z.string().default('hopdrop:realtime:events'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info')
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  throw new Error(`Invalid environment variables: ${JSON.stringify(parsed.error.flatten().fieldErrors)}`);
}

export const env = parsed.data;

export const allowedOrigins = env.FRONTEND_URL.split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

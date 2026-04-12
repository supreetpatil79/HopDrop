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
  NOTIFICATION_CONSUMER_PORT: z.coerce.number().default(5005),
  NOTIFICATION_CONSUMER_LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  MONGODB_URI: z.string().min(1),
  REDIS_URL: z.string().optional(),
  REDIS_CACHE_URL: z.string().optional(),
  REALTIME_EVENT_CHANNEL: z.string().default('hopdrop:realtime:events'),
  KAFKA_BROKERS: z.string().min(1),
  KAFKA_CLIENT_ID: z.string().default('hopdrop-notification-consumer'),
  KAFKA_TOPIC_PREFIX: z.string().default('hopdrop')
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  throw new Error(`Invalid environment variables: ${JSON.stringify(parsed.error.flatten().fieldErrors)}`);
}

export const env = parsed.data;

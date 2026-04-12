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
  SEARCH_INDEXER_PORT: z.coerce.number().default(5003),
  SEARCH_INDEXER_LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  ROUTING_SEARCH_URL: z.string().url(),
  KAFKA_BROKERS: z.string().min(1),
  KAFKA_CLIENT_ID: z.string().default('hopdrop-search-indexer'),
  KAFKA_TOPIC_PREFIX: z.string().default('hopdrop')
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  throw new Error(`Invalid environment variables: ${JSON.stringify(parsed.error.flatten().fieldErrors)}`);
}

export const env = parsed.data;

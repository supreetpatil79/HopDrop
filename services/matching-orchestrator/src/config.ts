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
  MATCHING_ORCHESTRATOR_PORT: z.coerce.number().default(5004),
  MATCHING_ORCHESTRATOR_LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  CORE_API_URL: z.string().url(),
  INTERNAL_API_TOKEN: z.string().min(16),
  KAFKA_BROKERS: z.string().min(1),
  KAFKA_CLIENT_ID: z.string().default('hopdrop-matching-orchestrator'),
  KAFKA_TOPIC_PREFIX: z.string().default('hopdrop')
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  throw new Error(`Invalid environment variables: ${JSON.stringify(parsed.error.flatten().fieldErrors)}`);
}

export const env = parsed.data;

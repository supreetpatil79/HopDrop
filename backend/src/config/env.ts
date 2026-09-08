import dotenv from 'dotenv';
import path from 'path';
import { z } from 'zod';

// Support monorepo scripts from both the repo root and the backend workspace.
[path.resolve(process.cwd(), '../.env'), path.resolve(process.cwd(), '.env')].forEach((envPath) => {
  dotenv.config({ path: envPath, override: false });
});

const booleanFromEnv = (defaultValue: boolean) =>
  z.preprocess((value) => {
    if (value === undefined || value === null || value === '') {
      return defaultValue;
    }

    if (typeof value === 'boolean') {
      return value;
    }

    if (typeof value === 'string') {
      const normalized = value.trim().toLowerCase();
      if (['true', '1', 'yes', 'on'].includes(normalized)) {
        return true;
      }
      if (['false', '0', 'no', 'off'].includes(normalized)) {
        return false;
      }
    }

    return value;
  }, z.boolean());

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(5000),
  REQUEST_TIMEOUT_MS: z.coerce.number().int().min(1000).max(120000).default(30000),
  HEADERS_TIMEOUT_MS: z.coerce.number().int().min(1000).max(120000).default(10000),
  KEEP_ALIVE_TIMEOUT_MS: z.coerce.number().int().min(1000).max(120000).default(5000),
  MAX_CONNECTIONS: z.coerce.number().int().min(100).max(100000).default(2000),
  MAX_IN_FLIGHT_REQUESTS: z.coerce.number().int().min(100).max(100000).default(1000),
  FRONTEND_URL: z.string().default('http://localhost'),
  INTERNAL_API_TOKEN: z.string().min(16).default('hopdrop-local-internal-token'),
  MONGODB_URI: z.string().default('mongodb://127.0.0.1:27017/hopdrop'),
  REDIS_URL: z.string().optional(),
  REDIS_CACHE_URL: z.string().optional(),
  REDIS_QUEUE_URL: z.string().optional(),
  REALTIME_EVENT_CHANNEL: z.string().default('hopdrop:realtime:events'),
  BULL_BOARD_PASSWORD: z.preprocess(
    (value) => (value === '' ? undefined : value),
    z.string().min(8).optional()
  ),
  ROUTING_SEARCH_URL: z.preprocess(
    (value) => (value === '' ? undefined : value),
    z.string().url().optional()
  ),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  REQUIRE_HTTPS: booleanFromEnv(false),
  SENTRY_DSN: z.preprocess(
    (value) => (value === '' ? undefined : value),
    z.string().url().optional()
  ),
  SENTRY_TRACES_SAMPLE_RATE: z.coerce.number().default(0.1),
  OTEL_ENABLED: booleanFromEnv(false),
  OTEL_SERVICE_NAME: z.string().default('hopdrop-core-api'),
  KAFKA_BROKERS: z.string().optional(),
  KAFKA_CLIENT_ID: z.string().default('hopdrop-core-api'),
  KAFKA_TOPIC_PREFIX: z.string().default('hopdrop'),
  KAFKA_SSL: booleanFromEnv(false),
  KAFKA_SASL_USERNAME: z.string().optional(),
  KAFKA_SASL_PASSWORD: z.string().optional(),
  OUTBOX_RELAY_ENABLED: booleanFromEnv(false),
  OUTBOX_POLL_INTERVAL_MS: z.coerce.number().default(3000),
  OUTBOX_BATCH_SIZE: z.coerce.number().default(25),
  OUTBOX_MAX_ATTEMPTS: z.coerce.number().default(8),
  JWT_ACCESS_SECRET: z.string().min(64).default('hopdrop-dev-jwt-access-secret-key-at-least-64-characters-long-for-security-001'),
  JWT_REFRESH_SECRET: z.string().min(64).default('hopdrop-dev-jwt-refresh-secret-key-at-least-64-characters-long-for-security-002'),
  JWT_ACCESS_EXPIRY: z.string().default('15m'),
  JWT_REFRESH_EXPIRY: z.string().default('7d'),
  DEMO_MODE: booleanFromEnv(process.env.NODE_ENV !== 'production'),
  MSG91_AUTH_KEY: z.string().optional(),
  MSG91_TEMPLATE_ID: z.string().optional(),
  MMI_CLIENT_ID: z.string().default('dummy-client-id'),
  MMI_CLIENT_SECRET: z.string().default('dummy-client-secret'),
  MMI_REST_API_KEY: z.string().default('zpsgumkpgmwsznqbwbisclhjcgiavrtpjobj'),
  RAZORPAY_KEY_ID: z.string().default('rzp_test_placeholder'),
  RAZORPAY_KEY_SECRET: z.string().default('placeholder_secret'),
  RAZORPAY_WEBHOOK_SECRET: z.string().default('placeholder_webhook_secret'),
  ESCROW_AUTO_RELEASE_HOURS: z.coerce.number().default(24),
  SAFETY_DEPOSIT_MULTIPLIER: z.coerce.number().default(1.5),
  MIN_SAFETY_DEPOSIT_PAISE: z.coerce.number().default(50000),
  GOOGLE_CLIENT_ID: z.string().optional(),
  ADMIN_PIN: z.string().default('hitchadmin2024'),
  RAPIDO_API_KEY: z.string().optional(),
  RAPIDO_BASE_URL: z.string().default('https://api.rapido.bike/v1'),
  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),
  PLATFORM_FEE_PERCENT: z.coerce.number().default(12),
  DEFAULT_SAFETY_DEPOSIT_PAISE: z.coerce.number().default(50000),
  ESCROW_RELEASE_DELAY_MS: z.coerce.number().default(7200000)
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.warn('⚠️ Environment variable validation warning, applying safe fallbacks:', parsed.error.flatten().fieldErrors);
}

export const env = parsed.success
  ? parsed.data
  : envSchema.parse({
      MONGODB_URI: 'mongodb://127.0.0.1:27017/hopdrop',
      JWT_ACCESS_SECRET: 'hopdrop-dev-jwt-access-secret-key-at-least-64-characters-long-for-security-001',
      JWT_REFRESH_SECRET: 'hopdrop-dev-jwt-refresh-secret-key-at-least-64-characters-long-for-security-002',
      MMI_CLIENT_ID: 'dummy-client-id',
      MMI_CLIENT_SECRET: 'dummy-client-secret',
      RAZORPAY_KEY_ID: 'rzp_test_placeholder',
      RAZORPAY_KEY_SECRET: 'placeholder_secret',
      RAZORPAY_WEBHOOK_SECRET: 'placeholder_webhook_secret',
      ...process.env
    });

// In production, warn if running in demo mode, but allow serverless execution
if (env.NODE_ENV === 'production' && env.DEMO_MODE) {
  console.warn('⚠️ Server running with DEMO_MODE=true');
}

function expandLoopbackOrigin(origin: string) {
  try {
    const url = new URL(origin);
    if (url.hostname !== 'localhost' && url.hostname !== '127.0.0.1') {
      return [origin];
    }

    const alternate = new URL(origin);
    alternate.hostname = url.hostname === 'localhost' ? '127.0.0.1' : 'localhost';
    return [origin, alternate.origin];
  } catch {
    return [origin];
  }
}

export const allowedOrigins = Array.from(
  new Set(
    env.FRONTEND_URL.split(',')
      .map((origin) => origin.trim())
      .filter(Boolean)
      .flatMap(expandLoopbackOrigin)
  )
);

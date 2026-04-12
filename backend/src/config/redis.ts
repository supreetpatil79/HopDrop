import { Queue } from 'bullmq';
import Redis from 'ioredis';
import { env } from './env';

const cacheUrl = env.REDIS_CACHE_URL || env.REDIS_URL || 'redis://localhost:6379';
const queueUrl = env.REDIS_QUEUE_URL || env.REDIS_URL || 'redis://localhost:6379';
const isTestEnv = env.NODE_ENV === 'test';

function createTestRedis(): Redis {
  const store = new Map<string, string>();

  return {
    status: 'ready',
    async get(key: string) {
      return store.get(key) ?? null;
    },
    async setex(key: string, _ttl: number, value: string) {
      store.set(key, value);
      return 'OK';
    },
    async del(...keys: string[]) {
      let deleted = 0;

      for (const key of keys) {
        if (store.delete(key)) {
          deleted += 1;
        }
      }

      return deleted;
    },
    async ping() {
      return 'PONG';
    },
    async scan(_cursor: number | string, ...args: unknown[]) {
      const matchIndex = args.findIndex((arg) => String(arg).toUpperCase() === 'MATCH');
      const pattern = typeof args[matchIndex + 1] === 'string' ? String(args[matchIndex + 1]) : '*';
      const matcher = new RegExp(`^${pattern.replaceAll('*', '.*')}$`);
      const keys = [...store.keys()].filter((key) => matcher.test(key));

      return ['0', keys] as [string, string[]];
    },
    async ttl(key: string) {
      return store.has(key) ? -1 : -2;
    },
    async publish() {
      return 0;
    }
  } as unknown as Redis;
}

function createTestQueue(): Queue {
  return {
    async add() {
      return { id: 'test-job' };
    }
  } as unknown as Queue;
}

export const cacheRedis = isTestEnv
  ? createTestRedis()
  : new Redis(cacheUrl, {
      maxRetriesPerRequest: null,
      enableReadyCheck: true
    });

export const queueConnection = isTestEnv
  ? createTestRedis()
  : new Redis(queueUrl, {
      maxRetriesPerRequest: null
    });

// Backward-compatible alias for services already importing `redis`.
export const redis = cacheRedis;

export const matchQueue = isTestEnv ? createTestQueue() : new Queue('matchQueue', { connection: queueConnection });
export const otpCleanupQueue = isTestEnv ? createTestQueue() : new Queue('otpCleanupQueue', { connection: queueConnection });
export const payoutQueue = isTestEnv ? createTestQueue() : new Queue('payoutQueue', { connection: queueConnection });
export const reminderQueue = isTestEnv ? createTestQueue() : new Queue('reminderQueue', { connection: queueConnection });

import { EventEmitter } from 'events';
import { Queue } from 'bullmq';
import Redis, { type RedisOptions } from 'ioredis';
import { env } from './env';

const cacheUrl = env.REDIS_CACHE_URL || env.REDIS_URL || 'redis://localhost:6379';
const queueUrl = env.REDIS_QUEUE_URL || env.REDIS_URL || 'redis://localhost:6379';
const isTestEnv = env.NODE_ENV === 'test';
const isServerless = process.env.VERCEL === '1' || Boolean(process.env.AWS_LAMBDA_FUNCTION_NAME) || !env.REDIS_URL;

class MockRedisEmitter extends EventEmitter {
  public status = 'ready';
  private store = new Map<string, string>();

  constructor() {
    super();
    // Pre-emit ready so BullMQ/ioredis listeners are satisfied
    setTimeout(() => {
      this.emit('ready');
      this.emit('connect');
    }, 0);
  }

  async get(key: string) {
    return this.store.get(key) ?? null;
  }

  async set(key: string, value: string) {
    this.store.set(key, value);
    return 'OK';
  }

  async setex(key: string, _ttl: number, value: string) {
    this.store.set(key, value);
    return 'OK';
  }

  async del(...keys: string[]) {
    let deleted = 0;
    for (const key of keys) {
      if (this.store.delete(key)) {
        deleted += 1;
      }
    }
    return deleted;
  }

  async ping() {
    return 'PONG';
  }

  async scan(_cursor: number | string, ...args: unknown[]) {
    const matchIndex = args.findIndex((arg) => String(arg).toUpperCase() === 'MATCH');
    const pattern = typeof args[matchIndex + 1] === 'string' ? String(args[matchIndex + 1]) : '*';
    const matcher = new RegExp(`^${pattern.replaceAll('*', '.*')}$`);
    const keys = [...this.store.keys()].filter((key) => matcher.test(key));
    return ['0', keys] as [string, string[]];
  }

  async ttl(key: string) {
    return this.store.has(key) ? -1 : -2;
  }

  async publish() {
    return 0;
  }

  async quit() {
    return 'OK';
  }

  async disconnect() {
    return 'OK';
  }

  async connect() {
    return;
  }

  duplicate() {
    return new MockRedisEmitter() as unknown as Redis;
  }
}

function createTestRedis(): Redis {
  return new MockRedisEmitter() as unknown as Redis;
}

function createTestQueue(): Queue {
  return {
    async add() {
      return { id: 'mock-job' };
    },
    async close() {
      return;
    },
    async getJobCounts() {
      return { active: 0, completed: 0, failed: 0, delayed: 0, waiting: 0 };
    }
  } as unknown as Queue;
}

function createRedisClient(url: string, options: RedisOptions = {}) {
  if (isTestEnv || isServerless) {
    return createTestRedis();
  }

  try {
    const client = new Redis(url, {
      maxRetriesPerRequest: null,
      lazyConnect: true,
      retryStrategy: (times) => (times > 3 ? null : Math.min(times * 100, 2000)),
      ...options
    });
    client.on('error', (err) => {
      console.warn('Redis connection warning:', err?.message || err);
    });
    return client;
  } catch (_e) {
    return createTestRedis();
  }
}

function createQueue(name: string) {
  if (isTestEnv || isServerless) {
    return createTestQueue();
  }

  try {
    return new Queue(name, { connection: queueConnection });
  } catch (_e) {
    return createTestQueue();
  }
}

export const cacheRedis = createRedisClient(cacheUrl, {
  enableReadyCheck: true
});

export const queueConnection = createRedisClient(queueUrl);

// Backward-compatible alias for services already importing `redis`.
export const redis = cacheRedis;

export const matchQueue = createQueue('matchQueue');
export const otpCleanupQueue = createQueue('otpCleanupQueue');
export const payoutQueue = createQueue('payoutQueue');
export const reminderQueue = createQueue('reminderQueue');
export const slaRematchQueue = createQueue('slaRematchQueue');
export const paymentReconcilerQueue = createQueue('paymentReconcilerQueue');

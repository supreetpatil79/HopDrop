import { Queue } from 'bullmq';
import Redis from 'ioredis';
import { env } from './env';

export const redis = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: null,
  enableReadyCheck: true
});

export const queueConnection = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: null
});

export const matchQueue = new Queue('matchQueue', { connection: queueConnection });
export const otpCleanupQueue = new Queue('otpCleanupQueue', { connection: queueConnection });
export const payoutQueue = new Queue('payoutQueue', { connection: queueConnection });
export const reminderQueue = new Queue('reminderQueue', { connection: queueConnection });

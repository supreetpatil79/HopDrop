import { Worker } from 'bullmq';
import { otpCleanupQueue, queueConnection, redis } from '../config/redis';

export const otpCleanupWorker = new Worker(
  'otpCleanupQueue',
  async () => {
    let cursor = '0';
    let expiredCount = 0;

    do {
      const [nextCursor, keys] = await redis.scan(cursor, 'MATCH', 'otp:*', 'COUNT', 100);
      cursor = nextCursor;

      if (keys.length) {
        const ttlResults = await Promise.all(keys.map((key) => redis.ttl(key)));
        expiredCount += ttlResults.filter((ttl) => ttl < 0).length;
      }
    } while (cursor !== '0');

    // eslint-disable-next-line no-console
    console.log(`OTP cleanup audit complete. Potential stale keys: ${expiredCount}`);
  },
  { connection: queueConnection }
);

otpCleanupQueue.add(
  'cleanup',
  {},
  {
    repeat: { every: 60 * 1000 },
    removeOnComplete: 100,
    removeOnFail: 100
  }
);

import { Worker } from 'bullmq';
import { otpCleanupQueue, queueConnection, redis } from '../config/redis';
import { logger } from '../observability/logger';
import { recordQueueJobOutcome } from '../observability/metrics';

export function createOtpCleanupWorker() {
  const worker = new Worker(
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

      logger.info({ expired_count: expiredCount }, 'otp_cleanup_audit_completed');
    },
    { connection: queueConnection }
  );

  worker.on('completed', () => {
    recordQueueJobOutcome('otp_cleanup', 'completed');
  });

  worker.on('failed', (job, err) => {
    recordQueueJobOutcome('otp_cleanup', 'failed');
    logger.error({ job_id: job?.id, error: err.message }, 'otp_cleanup_queue_job_failed');
  });

  return worker;
}

export function scheduleOtpCleanupAudit() {
  return otpCleanupQueue.add(
    'cleanup',
    {},
    {
      jobId: 'otp-cleanup-audit',
      repeat: { every: 60 * 1000 },
      removeOnComplete: 100,
      removeOnFail: 100
    }
  );
}

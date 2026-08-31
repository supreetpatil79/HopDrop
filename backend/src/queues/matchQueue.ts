import { Worker } from 'bullmq';
import { queueConnection } from '../config/redis';
import { logger } from '../observability/logger';
import { recordQueueJobOutcome } from '../observability/metrics';
import { findMatches } from '../services/matching.service';

export function createMatchWorker() {
  const worker = new Worker(
    'matchQueue',
    async (job) => {
      if (job.name === 'findMatches') {
        const { deliveryRequestId } = job.data as { deliveryRequestId: string };
        await findMatches(deliveryRequestId);
      }
    },
    { connection: queueConnection }
  );

  worker.on('completed', () => {
    recordQueueJobOutcome('match', 'completed');
  });

  worker.on('failed', (job, err) => {
    recordQueueJobOutcome('match', 'failed');
    logger.error({ job_id: job?.id, error: err.message }, 'match_queue_job_failed');
  });

  return worker;
}

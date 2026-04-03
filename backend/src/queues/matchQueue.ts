import { Worker } from 'bullmq';
import { queueConnection } from '../config/redis';
import { findMatches } from '../services/matching.service';

export const matchWorker = new Worker(
  'matchQueue',
  async (job) => {
    if (job.name === 'findMatches') {
      const { deliveryRequestId } = job.data as { deliveryRequestId: string };
      await findMatches(deliveryRequestId);
    }
  },
  { connection: queueConnection }
);

matchWorker.on('failed', (job, err) => {
  // eslint-disable-next-line no-console
  console.error(`matchQueue failed for job ${job?.id}`, err);
});

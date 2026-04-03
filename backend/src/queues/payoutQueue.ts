import { Worker } from 'bullmq';
import { queueConnection } from '../config/redis';
import { Match } from '../models/Match';
import { releaseFunds } from '../services/escrow.service';

export const payoutWorker = new Worker(
  'payoutQueue',
  async (job) => {
    if (job.name !== 'release-payout') {
      return;
    }

    const { matchId } = job.data as { matchId: string };
    const match = await Match.findById(matchId);

    if (!match) {
      return;
    }

    if (match.status === 'disputed') {
      return;
    }

    await releaseFunds(matchId);
  },
  { connection: queueConnection }
);

payoutWorker.on('failed', (job, err) => {
  // eslint-disable-next-line no-console
  console.error(`payoutQueue failed for job ${job?.id}`, err);
});

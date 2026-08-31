import { context } from '@opentelemetry/api';
import { Worker } from 'bullmq';
import { queueConnection } from '../config/redis';
import { Match } from '../models/Match';
import { logger } from '../observability/logger';
import { recordQueueJobOutcome } from '../observability/metrics';
import { extractTraceContext, getTracer } from '../observability/traceContext';
import { releaseFunds } from '../services/escrow.service';

export function createPayoutWorker() {
  const tracer = getTracer('payout-worker');

  const worker = new Worker(
    'payoutQueue',
    async (job) => {
      if (job.name !== 'release-payout') {
        return;
      }

      // ── Resume distributed trace from the originating HTTP request ──────
      const parentCtx = extractTraceContext(job.data as Record<string, unknown>);
      return context.with(parentCtx, async () => {
        const span = tracer.startSpan('payout.release', {}, parentCtx);
        try {
          const { matchId } = job.data as { matchId: string };
          span.setAttribute('match.id', matchId);

          const match = await Match.findById(matchId);
          if (!match) {
            span.setAttribute('result', 'match_not_found');
            return;
          }

          if (match.status === 'disputed') {
            span.setAttribute('result', 'skipped_disputed');
            return;
          }

          await releaseFunds(matchId);
          span.setAttribute('result', 'released');
        } catch (err) {
          span.recordException(err as Error);
          throw err;
        } finally {
          span.end();
        }
      });
    },
    { connection: queueConnection }
  );

  worker.on('completed', () => {
    recordQueueJobOutcome('payout', 'completed');
  });

  worker.on('failed', (job, err) => {
    recordQueueJobOutcome('payout', 'failed');
    logger.error({ job_id: job?.id, error: err.message }, 'payout_queue_job_failed');
  });

  return worker;
}

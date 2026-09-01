import { Worker } from 'bullmq';
import { paymentReconcilerQueue, queueConnection } from '../config/redis';
import { Match } from '../models/Match';
import { Transaction } from '../models/Transaction';
import { logger } from '../observability/logger';
import { recordQueueJobOutcome } from '../observability/metrics';

export async function processPaymentReconciliation(): Promise<{ reconciledCount: number }> {
  const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);

  // Find pending escrow transactions older than 10 minutes
  const pendingTransactions = await Transaction.find({
    status: 'pending',
    type: 'escrow_hold',
    createdAt: { $lte: tenMinutesAgo }
  });

  let reconciledCount = 0;

  for (const txn of pendingTransactions) {
    if (!txn.match) continue;

    const match = await Match.findById(txn.match);
    if (!match) continue;

    // If transaction has order ID and was pending, mark completed and lock match
    if (txn.razorpayPaymentId || txn.razorpayOrderId) {
      txn.status = 'completed';
      await txn.save();

      if (match.status === 'carrier_accepted' || match.status === 'proposed') {
        match.status = 'sender_confirmed';
        match.timeline.push({
          event: 'sender_confirmed',
          timestamp: new Date(),
          metadata: { reason: 'Payment reconciled via background reconciler engine.' }
        });
        await match.save();
        reconciledCount++;
      }
    }
  }

  return { reconciledCount };
}

export function createPaymentReconcilerWorker() {
  const worker = new Worker(
    'paymentReconcilerQueue',
    async () => {
      const result = await processPaymentReconciliation();
      if (result.reconciledCount > 0) {
        logger.info(result, 'payment_reconciliation_audit_completed');
      }
    },
    { connection: queueConnection }
  );

  worker.on('completed', () => {
    recordQueueJobOutcome('payment_reconciler', 'completed');
  });

  worker.on('failed', (job, err) => {
    recordQueueJobOutcome('payment_reconciler', 'failed');
    logger.error({ job_id: job?.id, error: err.message }, 'payment_reconciler_queue_job_failed');
  });

  return worker;
}

export function schedulePaymentReconcilerAudit() {
  return paymentReconcilerQueue.add(
    'payment-reconciler-audit',
    {},
    {
      jobId: 'payment-reconciliation-audit',
      repeat: { every: 5 * 60 * 1000 }, // Run every 5 minutes
      removeOnComplete: 100,
      removeOnFail: 100
    }
  );
}

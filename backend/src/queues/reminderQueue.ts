import { Worker } from 'bullmq';
import { queueConnection } from '../config/redis';
import { DeliveryRequest } from '../models/DeliveryRequest';
import { Trip } from '../models/Trip';
import { logger } from '../observability/logger';
import { recordQueueJobOutcome } from '../observability/metrics';
import { notifyUser } from '../services/notification.service';

export function createReminderWorker() {
  const worker = new Worker(
    'reminderQueue',
    async (job) => {
      const { tripId } = job.data as { tripId: string };
      const trip = await Trip.findById(tripId);
      if (!trip) {
        return;
      }

      if (job.name === 'trip-two-hour-reminder') {
        await notifyUser({
          userId: trip.carrier,
          title: 'Trip Reminder',
          body: 'Your trip starts in 2 hours. Prepare pickup coordination.',
          type: 'reminder',
          metadata: { tripId }
        });
        return;
      }

      if (job.name === 'trip-thirty-min-reminder') {
        const requests = await DeliveryRequest.find({
          match: { $in: trip.matches },
          paymentStatus: 'unpaid'
        });

        for (const request of requests) {
          await notifyUser({
            userId: request.sender,
            title: 'Payment Pending',
            body: 'Trip departure is soon. Complete payment to avoid cancellation.',
            type: 'reminder',
            metadata: { tripId, requestId: request._id.toString() }
          });
        }
      }
    },
    { connection: queueConnection }
  );

  worker.on('completed', () => {
    recordQueueJobOutcome('reminder', 'completed');
  });

  worker.on('failed', (job, err) => {
    recordQueueJobOutcome('reminder', 'failed');
    logger.error({ job_id: job?.id, error: err.message }, 'reminder_queue_job_failed');
  });

  return worker;
}

import { Worker } from 'bullmq';
import { queueConnection, slaRematchQueue } from '../config/redis';
import { DeliveryRequest } from '../models/DeliveryRequest';
import { Match } from '../models/Match';
import { Trip } from '../models/Trip';
import { User } from '../models/User';
import { logger } from '../observability/logger';
import { recordQueueJobOutcome } from '../observability/metrics';
import { matchTripAgainstPendingRequests } from '../services/matching.service';

export async function processSlaRematchAudit(): Promise<{ cancelledCount: number; rematchedCount: number }> {
  const now = new Date();
  const cutoffTime = new Date(now.getTime() + 45 * 60 * 1000); // 45 mins from now

  // Find matches where trip departs soon, but pickup has not happened
  const pendingMatches = await Match.find({
    status: { $in: ['carrier_accepted', 'sender_confirmed', 'pickup_pending'] },
    'otp.pickup.verifiedAt': { $exists: false }
  })
    .populate('trip')
    .populate('deliveryRequest');

  let cancelledCount = 0;
  let rematchedCount = 0;

  for (const match of pendingMatches) {
    const trip: any = match.trip;
    const deliveryRequest: any = match.deliveryRequest;

    if (!trip || !trip.departureTime) continue;

    const departure = new Date(trip.departureTime);
    // If departure is in less than 45 minutes or already in the past, and pickup OTP not verified
    if (departure <= cutoffTime) {
      logger.warn(
        {
          match_id: match._id.toString(),
          carrier_id: match.carrier?.toString(),
          departure: departure.toISOString()
        },
        'sla_carrier_ghosting_timeout_triggered'
      );

      // 1. Cancel Match
      match.status = 'cancelled';
      match.timeline.push({
        event: 'cancelled',
        timestamp: new Date(),
        metadata: { reason: 'Auto-cancelled due to SLA pickup timeout (<45 mins to departure with no pickup).' }
      });
      await match.save();
      cancelledCount++;

      // 2. Penalize Carrier Reliability Rating
      if (match.carrier) {
        await User.findByIdAndUpdate(match.carrier, {
          $inc: { 'rating.count': 1 },
          $set: { 'carrierPreferences.lastGhostedAt': new Date() }
        });
      }

      // 3. Revert Trip Capacity
      if (deliveryRequest?.package?.weightKg) {
        await Trip.findByIdAndUpdate(trip._id, {
          $inc: { 'availableCapacity.weightKg': deliveryRequest.package.weightKg }
        });
      }

      // 4. Re-open Delivery Request & Re-match
      if (deliveryRequest) {
        await DeliveryRequest.findByIdAndUpdate(deliveryRequest._id, {
          status: 'created',
          activeMatchId: null
        });

        // Trigger rematch search across other active trips
        try {
          const activeOtherTrips = await Trip.find({
            _id: { $ne: trip._id },
            status: 'active',
            departureTime: { $gte: now }
          }).limit(5);

          for (const otherTrip of activeOtherTrips) {
            await matchTripAgainstPendingRequests(otherTrip._id.toString());
          }
          rematchedCount++;
        } catch (rematchErr) {
          logger.error({ error: (rematchErr as Error).message }, 'sla_rematch_search_failed');
        }
      }
    }
  }

  return { cancelledCount, rematchedCount };
}

export function createSlaRematchWorker() {
  const worker = new Worker(
    'slaRematchQueue',
    async () => {
      const result = await processSlaRematchAudit();
      if (result.cancelledCount > 0) {
        logger.info(result, 'sla_ghosting_audit_completed');
      }
    },
    { connection: queueConnection }
  );

  worker.on('completed', () => {
    recordQueueJobOutcome('sla_rematch', 'completed');
  });

  worker.on('failed', (job, err) => {
    recordQueueJobOutcome('sla_rematch', 'failed');
    logger.error({ job_id: job?.id, error: err.message }, 'sla_rematch_queue_job_failed');
  });

  return worker;
}

export function scheduleSlaRematchAudit() {
  return slaRematchQueue.add(
    'sla-rematch-audit',
    {},
    {
      jobId: 'sla-ghosting-rematch-audit',
      repeat: { every: 60 * 1000 }, // Run every 60 seconds
      removeOnComplete: 100,
      removeOnFail: 100
    }
  );
}

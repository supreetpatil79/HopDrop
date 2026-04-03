import mongoose from 'mongoose';
import { matchQueue } from '../config/redis';
import { DeliveryRequest, IDeliveryRequest } from '../models/DeliveryRequest';
import { Match } from '../models/Match';
import { Trip, ITrip } from '../models/Trip';
import { ApiError } from '../utils/ApiError';
import { calculateQuote } from '../utils/pricing';
import { scoreTrip } from '../utils/tripMatcher';
import { emitToTrip, emitToUser, notifyUser } from './notification.service';

async function createMatchProposal(trip: any, req: IDeliveryRequest) {
  const reqId = req._id?.toString();
  if (!reqId) {
    throw new ApiError(400, 'Delivery request id missing');
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const quote = calculateQuote(trip.toObject ? trip.toObject() : trip, req);

    const [match] = await Match.create(
      [
        {
          trip: trip._id,
          deliveryRequest: reqId,
          carrier: trip.carrier._id,
          sender: req.sender,
          status: 'proposed',
          agreedPrice: quote.totalCharge,
          payoutToCarrier: quote.carrierEarning,
          timeline: [{ event: 'match_proposed', actor: trip.carrier._id, metadata: { totalCharge: quote.totalCharge } }]
        }
      ],
      { session }
    );

    await Trip.findByIdAndUpdate(trip._id, { $addToSet: { matches: match._id } }, { session });
    await DeliveryRequest.findByIdAndUpdate(reqId, { $set: { status: 'matched' } }, { session });

    await session.commitTransaction();
    session.endSession();

    await notifyUser({
      userId: trip.carrier._id,
      title: 'New Delivery Match',
      body: `New package request from ${req.origin.city} to ${req.destination.city}.`,
      type: 'match',
      metadata: { matchId: match._id.toString() }
    });

    await emitToUser(trip.carrier._id, 'match:proposed', {
      matchId: match._id.toString(),
      deliveryRequestId: reqId
    });

    await emitToTrip(trip._id.toString(), 'match:proposed', {
      matchId: match._id.toString(),
      deliveryRequestId: reqId
    });

    return match;
  } catch (error: any) {
    await session.abortTransaction();
    session.endSession();

    if (error?.code === 11000) {
      const existing = await Match.findOne({ trip: trip._id, deliveryRequest: reqId });
      if (existing) {
        return existing;
      }
    }

    throw error;
  }
}

export async function findMatches(deliveryRequestId: string) {
  const req = await DeliveryRequest.findById(deliveryRequestId);
  if (!req) {
    throw new ApiError(404, 'Delivery request not found');
  }

  const trips = await Trip.find({
    'origin.city': { $regex: new RegExp(req.origin.city, 'i') },
    'destination.city': { $regex: new RegExp(req.destination.city, 'i') },
    departureTime: {
      $gte: req.preferredDeliveryWindow.earliest,
      $lte: req.preferredDeliveryWindow.latest
    },
    status: 'active',
    safetyDepositPaid: true,
    'availableCapacity.weightKg': { $gte: req.package.weightKg },
    'availableCapacity.allowedCategories': req.package.category
  }).populate('carrier');

  const validTrips = trips.filter((trip: any) => !trip.carrier._id.equals(req.sender));

  const scored = validTrips
    .map((trip: any) => ({
      trip,
      score: scoreTrip(trip.toObject ? trip.toObject() : trip, req)
    }))
    .sort((a, b) => b.score - a.score);

  return Promise.all(scored.slice(0, 5).map(({ trip }) => createMatchProposal(trip, req)));
}

export async function queueMatching(deliveryRequestId: string) {
  await matchQueue.add(
    'findMatches',
    { deliveryRequestId },
    {
      removeOnComplete: 100,
      removeOnFail: 100,
      attempts: 3,
      backoff: { type: 'exponential', delay: 2000 }
    }
  );
}

export async function matchTripAgainstPendingRequests(tripId: string) {
  const trip = await Trip.findById(tripId).populate('carrier');
  if (!trip) {
    throw new ApiError(404, 'Trip not found');
  }

  const requests = await DeliveryRequest.find({
    status: 'pending',
    paymentStatus: { $in: ['unpaid', 'paid'] },
    'origin.city': { $regex: new RegExp(trip.origin.city, 'i') },
    'destination.city': { $regex: new RegExp(trip.destination.city, 'i') },
    'package.weightKg': { $lte: trip.availableCapacity.weightKg },
    'package.category': { $in: trip.availableCapacity.allowedCategories },
    'preferredDeliveryWindow.earliest': { $lte: trip.departureTime },
    'preferredDeliveryWindow.latest': { $gte: trip.departureTime }
  });

  const created: any[] = [];
  for (const req of requests) {
    if (req.sender.toString() === trip.carrier._id.toString()) {
      continue;
    }

    const match = await createMatchProposal(trip, req as unknown as IDeliveryRequest);
    created.push(match);
  }

  return created;
}

export async function estimateFromTrip(trip: ITrip, req: IDeliveryRequest) {
  return calculateQuote(trip, req);
}

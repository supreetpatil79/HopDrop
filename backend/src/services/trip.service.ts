import mongoose from 'mongoose';
import { DOMAIN_TOPICS, TRIP_EVENT_TYPES } from '../events/domainEvents';
import { endOfDay, startOfDay } from '../utils/time';
import { reminderQueue } from '../config/redis';
import { Match } from '../models/Match';
import { Transaction } from '../models/Transaction';
import { Trip } from '../models/Trip';
import { User } from '../models/User';
import { ApiError } from '../utils/ApiError';
import { isTransactionUnsupported } from '../utils/mongoTransactions';
import { env } from '../config/env';
import { matchTripAgainstPendingRequests } from './matching.service';
import { appendOutboxEvents } from './outbox.service';
import { confirmTripDeposit, createStandaloneOrder, createTripDepositOrder } from './payment.service';

const BLOCKING_MATCH_STATUSES = [
  'carrier_accepted',
  'sender_confirmed',
  'active',
  'pickup_pending',
  'picked_up',
  'in_transit',
  'delivery_pending',
  'delivered'
];

export async function createTrip(userId: string, payload: any) {
  async function persistTrip(session?: mongoose.ClientSession) {
    const trip = new Trip({
      ...payload,
      carrier: userId,
      status: 'active',
      safetyDepositPaid: false
    });

    await trip.save(session ? { session } : undefined);

    await User.findByIdAndUpdate(
      userId,
      {
        $addToSet: { role: 'carrier' },
        $inc: { totalTripsAsCarrier: 1 }
      },
      session ? { session } : undefined
    );

    await appendOutboxEvents(
      [
        {
          topic: DOMAIN_TOPICS.trip,
          eventType: TRIP_EVENT_TYPES.posted,
          aggregateType: 'trip',
          aggregateId: trip._id.toString(),
          partitionKey: trip._id.toString(),
          payload: {
            tripId: trip._id.toString(),
            carrierId: userId,
            origin: trip.origin,
            destination: trip.destination,
            departureTime: trip.departureTime,
            pricePerKg: trip.pricePerKg,
            availableCapacity: trip.availableCapacity,
            status: trip.status,
            safetyDepositPaid: trip.safetyDepositPaid
          }
        }
      ],
      session
    );

    return trip;
  }

  let trip;
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    trip = await persistTrip(session);
    await session.commitTransaction();
  } catch (error) {
    await session.abortTransaction();

    if (isTransactionUnsupported(error)) {
      trip = await persistTrip();
    } else {
      throw error;
    }
  } finally {
    session.endSession();
  }

  const departureMs = new Date(trip.departureTime).getTime();
  const now = Date.now();

  const twoHourReminderDelay = departureMs - now - 2 * 60 * 60 * 1000;
  if (twoHourReminderDelay > 0) {
    await reminderQueue.add('trip-two-hour-reminder', { tripId: trip._id.toString() }, { delay: twoHourReminderDelay });
  }

  const thirtyMinuteReminderDelay = departureMs - now - 30 * 60 * 1000;
  if (thirtyMinuteReminderDelay > 0) {
    await reminderQueue.add('trip-thirty-min-reminder', { tripId: trip._id.toString() }, { delay: thirtyMinuteReminderDelay });
  }

  return trip;
}

export async function listTrips(filters: {
  origin_city?: string;
  destination_city?: string;
  date?: string;
  mode?: string;
  min_capacity_kg?: number;
  page: number;
  limit: number;
}) {
  const query: Record<string, unknown> = { status: 'active' };

  if (filters.origin_city) {
    query['origin.city'] = { $regex: new RegExp(filters.origin_city, 'i') };
  }

  if (filters.destination_city) {
    query['destination.city'] = { $regex: new RegExp(filters.destination_city, 'i') };
  }

  if (filters.date) {
    const day = new Date(filters.date);
    query.departureTime = {
      $gte: startOfDay(day),
      $lte: endOfDay(day)
    };
  }

  if (filters.mode) {
    query.modeOfTransport = filters.mode;
  }

  if (filters.min_capacity_kg) {
    query['availableCapacity.weightKg'] = { $gte: filters.min_capacity_kg };
  }

  const page = filters.page || 1;
  const limit = filters.limit || 10;

  const [items, total] = await Promise.all([
    Trip.find(query)
      .populate('carrier', 'name rating profilePhoto totalTripsAsCarrier')
      .sort({ departureTime: 1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Trip.countDocuments(query)
  ]);

  const data = items.map((trip) => ({
    ...trip.toObject(),
    estimatedPrice: Math.round(trip.pricePerKg * 100)
  }));

  return {
    items: data,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit)
  };
}

export async function getTripById(tripId: string) {
  const trip = await Trip.findById(tripId).populate('carrier', 'name rating profilePhoto totalDeliveries totalTripsAsCarrier');
  if (!trip) {
    throw new ApiError(404, 'Trip not found');
  }

  return trip;
}

export async function updateTrip(userId: string, tripId: string, payload: Record<string, unknown>) {
  const trip = await Trip.findById(tripId);
  if (!trip) {
    throw new ApiError(404, 'Trip not found');
  }

  if (trip.carrier.toString() !== userId) {
    throw new ApiError(403, 'Forbidden');
  }

  const hasAcceptedMatches = await Match.exists({
    trip: trip._id,
    status: { $in: BLOCKING_MATCH_STATUSES }
  });

  if (hasAcceptedMatches) {
    throw new ApiError(400, 'Trip cannot be edited once matches are accepted');
  }

  Object.assign(trip, payload);
  await trip.save();

  await appendOutboxEvents([
    {
      topic: DOMAIN_TOPICS.trip,
      eventType: TRIP_EVENT_TYPES.updated,
      aggregateType: 'trip',
      aggregateId: trip._id.toString(),
      partitionKey: trip._id.toString(),
      payload: {
        tripId: trip._id.toString(),
        carrierId: trip.carrier.toString(),
        origin: trip.origin,
        destination: trip.destination,
        departureTime: trip.departureTime,
        pricePerKg: trip.pricePerKg,
        availableCapacity: trip.availableCapacity,
        status: trip.status,
        safetyDepositPaid: trip.safetyDepositPaid,
        updates: payload
      }
    }
  ]);

  return trip;
}

export async function cancelTrip(userId: string, tripId: string) {
  const trip = await Trip.findById(tripId);
  if (!trip) {
    throw new ApiError(404, 'Trip not found');
  }

  if (trip.carrier.toString() !== userId) {
    throw new ApiError(403, 'Forbidden');
  }

  if (trip.status === 'cancelled') {
    return trip;
  }

  trip.status = 'cancelled';
  await trip.save();

  if (trip.safetyDepositPaid && trip.safetyDepositAmount) {
    await User.findByIdAndUpdate(userId, {
      $inc: {
        'wallet.escrowHeld': -trip.safetyDepositAmount,
        'wallet.balance': trip.safetyDepositAmount
      }
    });

    await Transaction.create({
      user: userId,
      type: 'refund',
      amount: trip.safetyDepositAmount,
      status: 'completed',
      description: `Refund for cancelled trip ${trip._id.toString()}`
    });
  }

  await appendOutboxEvents([
    {
      topic: DOMAIN_TOPICS.trip,
      eventType: TRIP_EVENT_TYPES.cancelled,
      aggregateType: 'trip',
      aggregateId: trip._id.toString(),
      partitionKey: trip._id.toString(),
      payload: {
        tripId: trip._id.toString(),
        carrierId: trip.carrier.toString(),
        status: trip.status
      }
    }
  ]);

  return trip;
}

export async function createDepositOrder(userId: string, tripId: string) {
  return createTripDepositOrder(tripId, userId);
}

export async function createPreTripDepositOrder(userId: string) {
  const existing = await Transaction.findOne({
    user: userId,
    type: 'safety_deposit',
    status: { $in: ['initiated', 'pending'] },
    description: 'draft_trip_deposit'
  }).sort({ createdAt: -1 });

  if (existing?.razorpayOrderId) {
    return {
      orderId: existing.razorpayOrderId,
      amount: existing.amount,
      currency: existing.currency
    };
  }

  const amount = env.DEFAULT_SAFETY_DEPOSIT_PAISE;
  const order = await createStandaloneOrder({
    amount,
    receipt: `draft_trip_dep_${userId}_${Date.now()}`,
    notes: { type: 'safety_deposit', stage: 'pre_trip' }
  });

  await Transaction.create({
    user: userId,
    type: 'safety_deposit',
    amount,
    currency: order.currency,
    razorpayOrderId: order.orderId,
    status: 'initiated',
    description: 'draft_trip_deposit'
  });

  return order;
}

export async function confirmDeposit(
  userId: string,
  input: {
    tripId: string;
    razorpayOrderId: string;
    razorpayPaymentId: string;
    razorpaySignature: string;
  }
) {
  const result = await confirmTripDeposit({ userId, ...input });
  await matchTripAgainstPendingRequests(input.tripId);
  return result;
}

export async function listMyTrips(userId: string) {
  return Trip.find({ carrier: userId }).sort({ departureTime: -1 });
}

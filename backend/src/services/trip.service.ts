import { endOfDay, startOfDay } from '../utils/time';
import { reminderQueue } from '../config/redis';
import { Match } from '../models/Match';
import { Transaction } from '../models/Transaction';
import { Trip } from '../models/Trip';
import { User } from '../models/User';
import { ApiError } from '../utils/ApiError';
import { matchTripAgainstPendingRequests } from './matching.service';
import { confirmTripDeposit, createTripDepositOrder } from './payment.service';

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
  const trip = await Trip.create({
    ...payload,
    carrier: userId,
    status: 'active',
    safetyDepositPaid: false
  });

  await User.findByIdAndUpdate(userId, {
    $addToSet: { role: 'carrier' },
    $inc: { totalTripsAsCarrier: 1 }
  });

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

  return trip;
}

export async function createDepositOrder(userId: string, tripId: string) {
  return createTripDepositOrder(tripId, userId);
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

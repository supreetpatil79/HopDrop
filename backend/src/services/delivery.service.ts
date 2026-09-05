import mongoose from 'mongoose';
import { DELIVERY_EVENT_TYPES, DOMAIN_TOPICS } from '../events/domainEvents';
import { DeliveryRequest } from '../models/DeliveryRequest';
import { Match } from '../models/Match';
import { Trip } from '../models/Trip';
import { User } from '../models/User';
import { ApiError } from '../utils/ApiError';
import { isTransactionUnsupported, runInTransaction } from '../utils/mongoTransactions';
import { calculateQuote } from '../utils/pricing';
import { appendOutboxEvents } from './outbox.service';
import { confirmDeliveryPayment, createDeliveryOrder } from './payment.service';
import { findMatches } from './matching.service';
import { escapeRegex } from '../utils/sanitize';

export async function createDeliveryRequest(userId: string, payload: any) {
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  async function persistDeliveryRequest(session?: mongoose.ClientSession) {
    const draft = new DeliveryRequest({
      ...payload,
      sender: userId,
      status: 'pending',
      paymentStatus: 'unpaid',
      expiresAt
    });

    await draft.save(session ? { session } : undefined);

    const candidateTripQuery = Trip.findOne({
      'origin.city': { $regex: new RegExp(escapeRegex(payload.origin.city), 'i') },
      'destination.city': { $regex: new RegExp(escapeRegex(payload.destination.city), 'i') },
      status: 'active',
      safetyDepositPaid: true,
      'availableCapacity.weightKg': { $gte: payload.package.weightKg },
      'availableCapacity.allowedCategories': payload.package.category
    }).sort({ pricePerKg: 1 });

    if (session) {
      candidateTripQuery.session(session);
    }

    const candidateTrip = await candidateTripQuery;

    if (candidateTrip) {
      const quote = calculateQuote(candidateTrip.toObject(), draft.toObject());
      draft.quotedPrice = quote.carrierEarning;
      draft.platformFee = quote.platformFee;
      draft.totalCharge = quote.totalCharge;
      await draft.save(session ? { session } : undefined);
    }

    await appendOutboxEvents(
      [
        {
          topic: DOMAIN_TOPICS.delivery,
          eventType: DELIVERY_EVENT_TYPES.requested,
          aggregateType: 'delivery_request',
          aggregateId: draft._id.toString(),
          partitionKey: draft._id.toString(),
        payload: {
          requestId: draft._id.toString(),
          senderId: userId,
          origin: draft.origin,
          destination: draft.destination,
          preferredDeliveryWindow: draft.preferredDeliveryWindow,
          package: draft.package,
          status: draft.status,
          paymentStatus: draft.paymentStatus,
            totalCharge: draft.totalCharge || null
          }
        }
      ],
      session
    );

    return draft;
  }

  const draft = await runInTransaction(persistDeliveryRequest);
  return draft;
}

export async function listAllRequests() {
  return DeliveryRequest.find().sort({ createdAt: -1 });
}

export async function listMyRequests(userId: string) {
  return DeliveryRequest.find({ sender: userId }).sort({ createdAt: -1 });
}

export async function getRequestById(userId: string, requestId: string) {
  const request = await DeliveryRequest.findById(requestId).populate('match');
  if (!request) {
    throw new ApiError(404, 'Delivery request not found');
  }

  if (request.sender.toString() !== userId) {
    throw new ApiError(403, 'Forbidden');
  }

  return request;
}

export async function updateRequest(userId: string, requestId: string, payload: any) {
  const request = await DeliveryRequest.findById(requestId);
  if (!request) {
    throw new ApiError(404, 'Delivery request not found');
  }

  if (request.sender.toString() !== userId) {
    throw new ApiError(403, 'Forbidden');
  }

  if (request.status !== 'pending') {
    throw new ApiError(400, 'Only pending delivery requests can be updated');
  }

  const allowedDeliveryUpdates = [
    'origin',
    'destination',
    'package',
    'recipient',
    'preferredDeliveryWindow'
  ] as const;

  for (const key of allowedDeliveryUpdates) {
    if (payload[key] !== undefined) {
      (request as any)[key] = payload[key];
    }
  }
  await request.save();

  await appendOutboxEvents([
    {
      topic: DOMAIN_TOPICS.delivery,
      eventType: DELIVERY_EVENT_TYPES.updated,
      aggregateType: 'delivery_request',
      aggregateId: request._id.toString(),
      partitionKey: request._id.toString(),
      payload: {
        requestId: request._id.toString(),
        senderId: request.sender.toString(),
        origin: request.origin,
        destination: request.destination,
        preferredDeliveryWindow: request.preferredDeliveryWindow,
        package: request.package,
        status: request.status,
        paymentStatus: request.paymentStatus,
        updates: payload
      }
    }
  ]);

  return request;
}

export async function cancelRequest(userId: string, requestId: string) {
  const request = await DeliveryRequest.findById(requestId);
  if (!request) {
    throw new ApiError(404, 'Delivery request not found');
  }

  if (request.sender.toString() !== userId) {
    throw new ApiError(403, 'Forbidden');
  }

  if (request.status === 'cancelled') {
    return request;
  }

  request.status = 'cancelled';

  if (request.paymentStatus === 'paid' && request.totalCharge) {
    request.paymentStatus = 'refunded';

    await User.findByIdAndUpdate(userId, {
      $inc: {
        'wallet.escrowHeld': -request.totalCharge,
        'wallet.balance': request.totalCharge
      }
    });
  }

  await request.save();

  await Match.updateMany(
    {
      deliveryRequest: request._id,
      status: { $in: ['proposed', 'carrier_accepted', 'sender_confirmed', 'active', 'pickup_pending'] }
    },
    {
      $set: { status: 'cancelled' },
      $push: { timeline: { event: 'cancelled', actor: request.sender, metadata: { reason: 'delivery_cancelled' } } }
    }
  );

  await appendOutboxEvents([
    {
      topic: DOMAIN_TOPICS.delivery,
      eventType: DELIVERY_EVENT_TYPES.cancelled,
      aggregateType: 'delivery_request',
      aggregateId: request._id.toString(),
      partitionKey: request._id.toString(),
      payload: {
        requestId: request._id.toString(),
        senderId: request.sender.toString(),
        origin: request.origin,
        destination: request.destination,
        preferredDeliveryWindow: request.preferredDeliveryWindow,
        package: request.package,
        status: request.status,
        paymentStatus: request.paymentStatus
      }
    }
  ]);

  return request;
}

export async function createDeliveryPaymentOrder(userId: string, requestId: string) {
  return createDeliveryOrder(requestId, userId);
}

export async function confirmDeliveryPay(
  userId: string,
  input: {
    requestId: string;
    razorpayOrderId: string;
    razorpayPaymentId: string;
    razorpaySignature: string;
  }
) {
  return confirmDeliveryPayment({ userId, ...input });
}

export async function getRequestMatches(userId: string, requestId: string) {
  const request = await DeliveryRequest.findById(requestId);
  if (!request) {
    throw new ApiError(404, 'Delivery request not found');
  }

  if (request.sender.toString() !== userId) {
    throw new ApiError(403, 'Forbidden');
  }

  let matches = await Match.find({ deliveryRequest: requestId })
    .populate('carrier', 'name rating profilePhoto totalDeliveries')
    .populate('trip');

  if (!matches || matches.length === 0) {
    await findMatches(requestId);
    matches = await Match.find({ deliveryRequest: requestId })
      .populate('carrier', 'name rating profilePhoto totalDeliveries')
      .populate('trip');
  }

  return matches;
}

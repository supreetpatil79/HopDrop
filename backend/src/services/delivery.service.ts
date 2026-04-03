import { DeliveryRequest } from '../models/DeliveryRequest';
import { Match } from '../models/Match';
import { Trip } from '../models/Trip';
import { User } from '../models/User';
import { ApiError } from '../utils/ApiError';
import { calculateQuote } from '../utils/pricing';
import { queueMatching } from './matching.service';
import { confirmDeliveryPayment, createDeliveryOrder } from './payment.service';

export async function createDeliveryRequest(userId: string, payload: any) {
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

  const draft = await DeliveryRequest.create({
    ...payload,
    sender: userId,
    status: 'pending',
    paymentStatus: 'unpaid',
    expiresAt
  });

  const candidateTrip = await Trip.findOne({
    'origin.city': { $regex: new RegExp(payload.origin.city, 'i') },
    'destination.city': { $regex: new RegExp(payload.destination.city, 'i') },
    status: 'active',
    safetyDepositPaid: true,
    'availableCapacity.weightKg': { $gte: payload.package.weightKg },
    'availableCapacity.allowedCategories': payload.package.category
  }).sort({ pricePerKg: 1 });

  if (candidateTrip) {
    const quote = calculateQuote(candidateTrip.toObject(), draft.toObject());
    draft.quotedPrice = quote.carrierEarning;
    draft.platformFee = quote.platformFee;
    draft.totalCharge = quote.totalCharge;
    await draft.save();
  }

  await queueMatching(draft._id.toString());
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

  Object.assign(request, payload);
  await request.save();
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

  return Match.find({ deliveryRequest: requestId })
    .populate('carrier', 'name rating profilePhoto totalDeliveries')
    .populate('trip');
}

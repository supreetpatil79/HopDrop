import { env } from '../config/env';
import { payoutQueue } from '../config/redis';
import { DeliveryRequest } from '../models/DeliveryRequest';
import { Match } from '../models/Match';
import { Review } from '../models/Review';
import { Transaction } from '../models/Transaction';
import { Trip } from '../models/Trip';
import { User } from '../models/User';
import { ApiError } from '../utils/ApiError';
import { holdFunds } from './escrow.service';
import { emitToMatch, emitToUser, notifyUser } from './notification.service';
import { generateOTP, otpKeys, verifyOTP } from './otp.service';
import { bookRapido } from './rapido.service';

async function ensureInvolved(matchId: string, userId: string) {
  const match = await Match.findById(matchId)
    .populate('trip')
    .populate('carrier', 'name rating profilePhoto totalDeliveries')
    .populate('sender', 'name rating profilePhoto totalDeliveries')
    .populate('deliveryRequest');

  if (!match) {
    throw new ApiError(404, 'Match not found');
  }

  const carrierId = (match.carrier as any)._id?.toString?.() || match.carrier.toString();
  const senderId = (match.sender as any)._id?.toString?.() || match.sender.toString();

  if (carrierId !== userId && senderId !== userId) {
    throw new ApiError(403, 'Forbidden');
  }

  return match;
}

export async function getMatchById(matchId: string, userId: string) {
  return ensureInvolved(matchId, userId);
}

export async function carrierAccept(matchId: string, userId: string) {
  const match = await Match.findById(matchId);
  if (!match) {
    throw new ApiError(404, 'Match not found');
  }

  if (match.carrier.toString() !== userId) {
    throw new ApiError(403, 'Forbidden');
  }

  if (match.status !== 'proposed') {
    throw new ApiError(400, 'Match already processed');
  }

  match.status = 'carrier_accepted';
  match.timeline.push({ event: 'carrier_accepted', actor: match.carrier, timestamp: new Date() });
  await match.save();

  await notifyUser({
    userId: match.sender,
    title: 'Carrier Accepted',
    body: 'A carrier accepted your delivery request. Confirm to proceed.',
    type: 'match',
    metadata: { matchId }
  });

  await emitToUser(match.sender, 'match:carrier_accepted', { matchId });
  await emitToMatch(matchId, 'match:carrier_accepted', { matchId });
  return match;
}

export async function carrierReject(matchId: string, userId: string) {
  const match = await Match.findById(matchId);
  if (!match) {
    throw new ApiError(404, 'Match not found');
  }

  if (match.carrier.toString() !== userId) {
    throw new ApiError(403, 'Forbidden');
  }

  match.status = 'cancelled';
  match.timeline.push({ event: 'cancelled', actor: match.carrier, timestamp: new Date(), metadata: { reason: 'carrier_rejected' } });
  await match.save();

  return match;
}

export async function senderConfirm(matchId: string, userId: string) {
  const match = await Match.findById(matchId);
  if (!match) {
    throw new ApiError(404, 'Match not found');
  }

  if (match.sender.toString() !== userId) {
    throw new ApiError(403, 'Forbidden');
  }

  if (match.status !== 'carrier_accepted') {
    throw new ApiError(400, 'Match must be accepted by carrier first');
  }

  const request = await DeliveryRequest.findById(match.deliveryRequest);
  if (!request) {
    throw new ApiError(404, 'Delivery request missing');
  }

  match.status = request.paymentStatus === 'paid' ? 'active' : 'sender_confirmed';
  match.timeline.push({ event: 'sender_confirmed', actor: match.sender, timestamp: new Date() });
  if (request.paymentStatus === 'paid') {
    match.timeline.push({ event: 'payment_done', actor: match.sender, timestamp: new Date() });
    const existingHold = await Transaction.exists({ match: match._id, type: 'escrow_hold' });
    if (!existingHold) {
      await holdFunds(match._id.toString(), request.totalCharge || match.agreedPrice, 'sender_payment');
    }
  }
  await match.save();

  request.match = match._id;
  await request.save();

  await notifyUser({
    userId: match.carrier,
    title: 'Sender Confirmed Match',
    body: request.paymentStatus === 'paid' ? 'Sender confirmed and paid. You can start pickup.' : 'Sender confirmed. Awaiting payment.',
    type: 'match',
    metadata: { matchId }
  });

  if (request.paymentStatus === 'paid') {
    await emitToUser(match.carrier, 'match:payment_received', { matchId });
  }

  await emitToMatch(matchId, request.paymentStatus === 'paid' ? 'match:payment_received' : 'notification:new', {
    matchId,
    paymentStatus: request.paymentStatus
  });

  return {
    match,
    paymentRequired: request.paymentStatus !== 'paid'
  };
}

export async function senderReject(matchId: string, userId: string) {
  const match = await Match.findById(matchId);
  if (!match) {
    throw new ApiError(404, 'Match not found');
  }

  if (match.sender.toString() !== userId) {
    throw new ApiError(403, 'Forbidden');
  }

  match.status = 'cancelled';
  match.timeline.push({ event: 'cancelled', actor: match.sender, timestamp: new Date(), metadata: { reason: 'sender_rejected' } });
  await match.save();

  return match;
}

export async function generatePickupOtp(matchId: string, userId: string) {
  const match = await Match.findById(matchId);
  if (!match) {
    throw new ApiError(404, 'Match not found');
  }

  if (match.carrier.toString() !== userId) {
    throw new ApiError(403, 'Forbidden');
  }

  const request = await DeliveryRequest.findById(match.deliveryRequest);
  if (!request) {
    throw new ApiError(404, 'Delivery request not found');
  }

  if (request.paymentStatus !== 'paid') {
    throw new ApiError(400, 'Payment pending. Cannot generate pickup OTP yet.');
  }

  const otp = await generateOTP(otpKeys.pickup(matchId));

  match.status = 'pickup_pending';
  match.otp.pickup.generatedAt = new Date();
  match.timeline.push({ event: 'pickup_otp_generated', actor: match.carrier, timestamp: new Date() });
  await match.save();

  request.status = 'pickup_otp_sent';
  await request.save();

  await notifyUser({
    userId: match.sender,
    title: 'Pickup OTP Generated',
    body: 'Carrier has generated pickup OTP. Verify to hand over package.',
    type: 'otp',
    metadata: { matchId }
  });

  await emitToUser(match.carrier, 'otp:pickup_generated', { matchId });
  await emitToMatch(matchId, 'otp:pickup_generated', { matchId });

  return { otp, ttlSeconds: 600 };
}

export async function verifyPickupOtpForMatch(matchId: string, userId: string, otp: string) {
  const match = await Match.findById(matchId);
  if (!match) {
    throw new ApiError(404, 'Match not found');
  }

  if (match.sender.toString() !== userId) {
    throw new ApiError(403, 'Only sender can verify pickup OTP');
  }

  await verifyOTP(otpKeys.pickup(matchId), otp);

  match.status = 'picked_up';
  match.otp.pickup.verifiedAt = new Date();
  match.timeline.push({ event: 'pickup_verified', actor: match.sender, timestamp: new Date() });
  await match.save();

  await DeliveryRequest.findByIdAndUpdate(match.deliveryRequest, { $set: { status: 'picked_up' } });
  await Trip.findByIdAndUpdate(match.trip, { $set: { status: 'in_transit' } });
  await emitToUser(match.sender, 'trip:status_changed', { tripId: match.trip.toString(), status: 'in_transit' });
  await emitToUser(match.carrier, 'trip:status_changed', { tripId: match.trip.toString(), status: 'in_transit' });

  await notifyUser({
    userId: match.carrier,
    title: 'Pickup Verified',
    body: 'Package pickup verified. You are now in transit.',
    type: 'otp',
    metadata: { matchId }
  });

  await emitToUser(match.sender, 'otp:pickup_verified', { matchId });
  await emitToUser(match.carrier, 'otp:pickup_verified', { matchId });
  await emitToMatch(matchId, 'otp:pickup_verified', { matchId });
  return match;
}

export async function generateDeliveryOtp(matchId: string, userId: string) {
  const match = await Match.findById(matchId);
  if (!match) {
    throw new ApiError(404, 'Match not found');
  }

  if (match.carrier.toString() !== userId) {
    throw new ApiError(403, 'Forbidden');
  }

  if (!['picked_up', 'in_transit', 'delivery_pending'].includes(match.status)) {
    throw new ApiError(400, 'Delivery OTP can be generated only when in transit');
  }

  const otp = await generateOTP(otpKeys.delivery(matchId));

  match.status = 'delivery_pending';
  match.otp.delivery.generatedAt = new Date();
  match.timeline.push({ event: 'delivery_otp_generated', actor: match.carrier, timestamp: new Date() });
  await match.save();

  await DeliveryRequest.findByIdAndUpdate(match.deliveryRequest, { $set: { status: 'delivery_otp_sent' } });

  await emitToUser(match.carrier, 'otp:delivery_generated', { matchId });
  await emitToMatch(matchId, 'otp:delivery_generated', { matchId });
  return { otp, ttlSeconds: 600 };
}

export async function verifyDeliveryOtpForMatch(matchId: string, userId: string, otp: string) {
  const match = await Match.findById(matchId);
  if (!match) {
    throw new ApiError(404, 'Match not found');
  }

  if (match.sender.toString() !== userId && match.carrier.toString() !== userId) {
    throw new ApiError(403, 'Forbidden');
  }

  await verifyOTP(otpKeys.delivery(matchId), otp);

  match.status = 'delivered';
  match.otp.delivery.verifiedAt = new Date();
  match.timeline.push({ event: 'delivery_verified', actor: match.sender, timestamp: new Date() });
  match.timeline.push({ event: 'completed', actor: match.carrier, timestamp: new Date() });
  await match.save();

  await DeliveryRequest.findByIdAndUpdate(match.deliveryRequest, {
    $set: { status: 'delivered' }
  });

  const pendingOnTrip = await Match.countDocuments({
    trip: match.trip,
    status: { $nin: ['delivered', 'cancelled', 'disputed'] }
  });

  if (pendingOnTrip === 0) {
    await Trip.findByIdAndUpdate(match.trip, { $set: { status: 'completed' } });
    await emitToUser(match.sender, 'trip:status_changed', { tripId: match.trip.toString(), status: 'completed' });
    await emitToUser(match.carrier, 'trip:status_changed', { tripId: match.trip.toString(), status: 'completed' });
  }

  await payoutQueue.add(
    'release-payout',
    { matchId },
    {
      delay: env.ESCROW_RELEASE_DELAY_MS,
      removeOnComplete: 100,
      removeOnFail: 100
    }
  );

  await emitToUser(match.sender, 'otp:delivery_verified', { matchId });
  await emitToUser(match.carrier, 'otp:delivery_verified', { matchId });
  await emitToMatch(matchId, 'otp:delivery_verified', { matchId });
  return match;
}

export async function rateMatch(matchId: string, userId: string, input: { score: number; comment?: string }) {
  const match = await Match.findById(matchId);
  if (!match) {
    throw new ApiError(404, 'Match not found');
  }

  if (match.status !== 'delivered') {
    throw new ApiError(400, 'Rating allowed only after delivery');
  }

  const isSender = match.sender.toString() === userId;
  const isCarrier = match.carrier.toString() === userId;
  if (!isSender && !isCarrier) {
    throw new ApiError(403, 'Forbidden');
  }

  const now = new Date();
  const ratedUserId = isSender ? match.carrier.toString() : match.sender.toString();

  if (isSender) {
    match.rating.senderRatedCarrier = { score: input.score, comment: input.comment, at: now };
  } else {
    match.rating.carrierRatedSender = { score: input.score, comment: input.comment, at: now };
  }

  await match.save();

  await Review.findOneAndUpdate(
    {
      match: match._id,
      from: userId,
      to: ratedUserId
    },
    {
      $set: {
        score: input.score,
        comment: input.comment
      }
    },
    {
      upsert: true,
      new: true
    }
  );

  const ratedUser = await User.findById(ratedUserId);
  if (ratedUser) {
    const currentCount = ratedUser.rating.count || 0;
    const currentAvg = ratedUser.rating.average || 5;
    const newCount = currentCount + 1;
    const newAvg = (currentAvg * currentCount + input.score) / newCount;

    ratedUser.rating.count = newCount;
    ratedUser.rating.average = Number(newAvg.toFixed(2));
    await ratedUser.save();
  }

  return match;
}

export async function disputeMatch(matchId: string, userId: string, input: { reason: string; description: string }) {
  const match = await ensureInvolved(matchId, userId);

  const carrierId = (match.carrier as any)._id?.toString?.() || (match.carrier as any).toString();
  const senderId = (match.sender as any)._id?.toString?.() || (match.sender as any).toString();
  const actorId = userId === carrierId ? carrierId : senderId;

  (match as any).status = 'disputed';
  (match as any).timeline.push({
    event: 'disputed',
    timestamp: new Date(),
    actor: actorId,
    metadata: input
  });

  await (match as any).save();

  await emitToMatch(matchId, 'notification:new', {
    type: 'dispute',
    matchId,
    reason: input.reason
  });

  return match;
}

export async function requestRapidoForMatch(matchId: string, userId: string, input: { pickupCoords: [number, number]; dropAddress: string }) {
  const match = await Match.findById(matchId);
  if (!match) {
    throw new ApiError(404, 'Match not found');
  }

  if (match.carrier.toString() !== userId) {
    throw new ApiError(403, 'Only carrier can request Rapido');
  }

  const rapidoResponse = await bookRapido(matchId, input.pickupCoords, input.dropAddress);

  match.rapido.requested = true;
  match.rapido.bookingId = rapidoResponse.bookingId || rapidoResponse.id;
  match.rapido.status = rapidoResponse.status || 'booked';
  match.timeline.push({
    event: 'rapido_booked',
    timestamp: new Date(),
    actor: match.carrier,
    metadata: { bookingId: match.rapido.bookingId }
  });
  await match.save();

  await emitToMatch(matchId, 'notification:new', {
    type: 'rapido',
    matchId,
    bookingId: match.rapido.bookingId
  });

  return match;
}

import { Match } from '../models/Match';
import { Transaction } from '../models/Transaction';
import { Trip } from '../models/Trip';
import { User } from '../models/User';
import { DeliveryRequest } from '../models/DeliveryRequest';
import { env } from '../config/env';
import { ApiError } from '../utils/ApiError';

export async function holdFunds(matchId: string, amount: number, type: 'carrier_deposit' | 'sender_payment') {
  const match = await Match.findById(matchId);
  if (!match) {
    throw new ApiError(404, 'Match not found');
  }

  const userId = type === 'carrier_deposit' ? match.carrier : match.sender;

  await Transaction.create({
    user: userId,
    match: match._id,
    type: 'escrow_hold',
    amount,
    currency: 'INR',
    status: 'pending',
    description: `Escrow hold (${type})`
  });

  await User.findByIdAndUpdate(userId, {
    $inc: { 'wallet.escrowHeld': amount }
  });
}

export async function releaseFunds(matchId: string) {
  const match = await Match.findById(matchId);
  if (!match) {
    throw new ApiError(404, 'Match not found');
  }

  const alreadyReleased = await Transaction.exists({
    match: match._id,
    type: 'carrier_payout',
    status: 'completed'
  });
  if (alreadyReleased) {
    return {
      payoutToCarrier: match.payoutToCarrier || 0,
      depositAmount: 0,
      platformFee: 0
    };
  }

  const trip = await Trip.findById(match.trip);
  const delivery = await DeliveryRequest.findById(match.deliveryRequest);

  if (!trip || !delivery) {
    throw new ApiError(404, 'Related trip or delivery request not found');
  }

  const carrier = await User.findById(match.carrier);
  const sender = await User.findById(match.sender);

  if (!carrier || !sender) {
    throw new ApiError(404, 'Users not found');
  }

  const depositAmount = trip.safetyDepositAmount || 0;
  const senderPayment = delivery.totalCharge || match.agreedPrice;
  const platformFee = delivery.platformFee || Math.round((senderPayment * env.PLATFORM_FEE_PERCENT) / 100);
  const payoutToCarrier = delivery.quotedPrice || Math.max(senderPayment - platformFee, 0);

  carrier.wallet.escrowHeld = Math.max(0, carrier.wallet.escrowHeld - depositAmount);
  carrier.wallet.balance += depositAmount + payoutToCarrier;

  sender.wallet.escrowHeld = Math.max(0, sender.wallet.escrowHeld - senderPayment);

  await carrier.save();
  await sender.save();

  await Transaction.create([
    {
      user: carrier._id,
      match: match._id,
      type: 'escrow_release',
      amount: depositAmount,
      status: 'completed',
      description: 'Safety deposit released to carrier wallet'
    },
    {
      user: carrier._id,
      match: match._id,
      type: 'carrier_payout',
      amount: payoutToCarrier,
      status: 'completed',
      description: 'Delivery payout released to carrier'
    },
    {
      user: sender._id,
      match: match._id,
      type: 'platform_fee',
      amount: platformFee,
      status: 'completed',
      description: 'Platform fee deducted'
    }
  ]);

  match.payoutToCarrier = payoutToCarrier;
  await match.save();

  return {
    payoutToCarrier,
    depositAmount,
    platformFee
  };
}

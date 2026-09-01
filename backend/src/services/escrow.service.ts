import { Match } from '../models/Match';
import { Transaction } from '../models/Transaction';
import { Trip } from '../models/Trip';
import { User } from '../models/User';
import { DeliveryRequest } from '../models/DeliveryRequest';
import { env } from '../config/env';
import { ApiError } from '../utils/ApiError';
import { runInTransaction } from '../utils/mongoTransactions';

export async function holdFunds(matchId: string, amount: number, type: 'carrier_deposit' | 'sender_payment') {
  const match = await Match.findById(matchId);
  if (!match) {
    throw new ApiError(404, 'Match not found');
  }

  const userId = type === 'carrier_deposit' ? match.carrier : match.sender;

  // Hold the escrow record and wallet atomically so they can never diverge
  await runInTransaction(async (session) => {
    await Transaction.create(
      [
        {
          user: userId,
          match: match._id,
          type: 'escrow_hold',
          amount,
          currency: 'INR',
          status: 'pending',
          description: `Escrow hold (${type})`
        }
      ],
      { session: session ?? undefined }
    );

    await User.findByIdAndUpdate(
      userId,
      { $inc: { 'wallet.escrowHeld': amount } },
      { session: session ?? undefined }
    );
  });
}

export async function releaseFunds(matchId: string) {
  const match = await Match.findById(matchId);
  if (!match) {
    throw new ApiError(404, 'Match not found');
  }

  // Fast idempotency check before entering the transaction
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

  const depositAmount = trip.safetyDepositAmount || 0;
  const senderPayment = delivery.totalCharge || match.agreedPrice;
  const platformFee = delivery.platformFee || Math.round((senderPayment * env.PLATFORM_FEE_PERCENT) / 100);
  const payoutToCarrier = delivery.quotedPrice || Math.max(senderPayment - platformFee, 0);

  // ── All wallet mutations, ledger writes, and match update run inside a
  //    single MongoDB transaction. If any step fails, everything rolls back —
  //    no partial payouts, no double-releases, no missing ledger rows.
  await runInTransaction(async (session) => {
    // Re-fetch users and match with the session so we get the latest
    // committed state and participate fully in the transaction
    const [txCarrier, txSender, txMatch] = await Promise.all([
      User.findById(match.carrier).session(session ?? null),
      User.findById(match.sender).session(session ?? null),
      Match.findById(match._id).session(session ?? null)
    ]);

    if (!txCarrier || !txSender || !txMatch) {
      throw new ApiError(404, 'Users or match disappeared inside transaction');
    }

    // Second idempotency check inside the transaction to handle two payout
    // workers racing to release the same match simultaneously
    const stillReleased = await Transaction.exists({
      match: txMatch._id,
      type: 'carrier_payout',
      status: 'completed'
    }).session(session ?? null);

    if (stillReleased) {
      return; // concurrent worker already handled it — exit cleanly
    }

    txCarrier.wallet.escrowHeld = Math.max(0, txCarrier.wallet.escrowHeld - depositAmount);
    txCarrier.wallet.balance += depositAmount + payoutToCarrier;
    txSender.wallet.escrowHeld = Math.max(0, txSender.wallet.escrowHeld - senderPayment);

    await txCarrier.save({ session: session ?? undefined });
    await txSender.save({ session: session ?? undefined });

    await Transaction.create(
      [
        {
          user: txCarrier._id,
          match: txMatch._id,
          type: 'escrow_release',
          amount: depositAmount,
          status: 'completed',
          description: 'Safety deposit released to carrier wallet'
        },
        {
          user: txCarrier._id,
          match: txMatch._id,
          type: 'carrier_payout',
          amount: payoutToCarrier,
          status: 'completed',
          description: 'Delivery payout released to carrier'
        },
        {
          user: txSender._id,
          match: txMatch._id,
          type: 'platform_fee',
          amount: platformFee,
          status: 'completed',
          description: 'Platform fee deducted'
        }
      ],
      { session: session ?? undefined }
    );

    txMatch.payoutToCarrier = payoutToCarrier;
    await txMatch.save({ session: session ?? undefined });
  });

  return { payoutToCarrier, depositAmount, platformFee };
}

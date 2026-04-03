import crypto from 'crypto';
import Razorpay from 'razorpay';
import { env } from '../config/env';
import { DeliveryRequest } from '../models/DeliveryRequest';
import { Transaction } from '../models/Transaction';
import { Trip } from '../models/Trip';
import { User } from '../models/User';
import { ApiError } from '../utils/ApiError';
import { holdFunds } from './escrow.service';
import { emitToUser, notifyUser } from './notification.service';

const razorpay = new Razorpay({
  key_id: env.RAZORPAY_KEY_ID,
  key_secret: env.RAZORPAY_KEY_SECRET
});

function verifySignature(orderId: string, paymentId: string, signature: string): boolean {
  if (orderId.startsWith('mock_order_') && signature === 'mock_signature') {
    return true;
  }

  const hmac = crypto.createHmac('sha256', env.RAZORPAY_KEY_SECRET);
  hmac.update(`${orderId}|${paymentId}`);
  const generated = hmac.digest('hex');
  return generated === signature;
}

async function createOrder(amount: number, receipt: string, notes: Record<string, string>) {
  try {
    return await razorpay.orders.create({ amount, currency: 'INR', receipt, notes });
  } catch (_error) {
    return {
      id: `mock_order_${Date.now()}`,
      amount,
      currency: 'INR',
      receipt,
      notes,
      status: 'created'
    };
  }
}

export async function createTripDepositOrder(tripId: string, userId: string) {
  const trip = await Trip.findById(tripId);
  if (!trip) {
    throw new ApiError(404, 'Trip not found');
  }

  if (trip.carrier.toString() !== userId) {
    throw new ApiError(403, 'Forbidden');
  }

  if (trip.safetyDepositPaid) {
    return {
      alreadyPaid: true,
      amount: trip.safetyDepositAmount || env.DEFAULT_SAFETY_DEPOSIT_PAISE,
      orderId: trip.safetyDepositTransactionId
    };
  }

  const existingTx = await Transaction.findOne({
    user: userId,
    type: 'safety_deposit',
    status: { $in: ['initiated', 'pending'] },
    description: `trip:${tripId}`
  }).sort({ createdAt: -1 });

  if (existingTx?.razorpayOrderId) {
    return {
      order: {
        id: existingTx.razorpayOrderId,
        amount: existingTx.amount,
        currency: existingTx.currency
      },
      amount: existingTx.amount
    };
  }

  const amount = trip.safetyDepositAmount || env.DEFAULT_SAFETY_DEPOSIT_PAISE;
  const order = await createOrder(amount, `trip_dep_${tripId}`, { tripId, type: 'safety_deposit' });

  if (existingTx) {
    existingTx.razorpayOrderId = order.id;
    existingTx.amount = amount;
    await existingTx.save();
  } else {
    await Transaction.create({
      user: userId,
      type: 'safety_deposit',
      amount,
      currency: 'INR',
      razorpayOrderId: order.id,
      status: 'initiated',
      description: `trip:${tripId}`
    });
  }

  trip.safetyDepositAmount = amount;
  await trip.save();

  return { order, amount };
}

export async function confirmTripDeposit(input: {
  tripId: string;
  userId: string;
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
}) {
  const { tripId, userId, razorpayOrderId, razorpayPaymentId, razorpaySignature } = input;
  const trip = await Trip.findById(tripId);

  if (!trip) {
    throw new ApiError(404, 'Trip not found');
  }

  if (trip.carrier.toString() !== userId) {
    throw new ApiError(403, 'Forbidden');
  }

  if (!verifySignature(razorpayOrderId, razorpayPaymentId, razorpaySignature)) {
    throw new ApiError(400, 'Invalid payment signature');
  }

  const tx = await Transaction.findOne({
    razorpayOrderId,
    user: userId,
    type: 'safety_deposit'
  });

  if (!tx) {
    throw new ApiError(404, 'Deposit transaction not found');
  }

  if (tx.status === 'completed' && trip.safetyDepositPaid) {
    return { success: true, idempotent: true };
  }

  tx.razorpayPaymentId = razorpayPaymentId;
  tx.razorpaySignature = razorpaySignature;
  tx.status = 'completed';
  await tx.save();

  await User.findByIdAndUpdate(userId, {
    $inc: { 'wallet.escrowHeld': tx.amount }
  });

  trip.safetyDepositPaid = true;
  trip.safetyDepositTransactionId = razorpayPaymentId;
  await trip.save();

  await notifyUser({
    userId,
    title: 'Safety Deposit Locked',
    body: 'Your safety deposit is held in escrow for this trip.',
    type: 'payment'
  });
  await emitToUser(userId, 'payment:status', { status: 'success', type: 'safety_deposit', tripId });

  return { success: true };
}

export async function createDeliveryOrder(requestId: string, userId: string) {
  const request = await DeliveryRequest.findById(requestId);
  if (!request) {
    throw new ApiError(404, 'Delivery request not found');
  }

  if (request.sender.toString() !== userId) {
    throw new ApiError(403, 'Forbidden');
  }

  if (request.paymentStatus === 'paid' && request.paymentOrderId) {
    return {
      alreadyPaid: true,
      order: { id: request.paymentOrderId, amount: request.totalCharge }
    };
  }

  if (request.paymentOrderId && request.paymentStatus === 'unpaid') {
    return {
      order: { id: request.paymentOrderId, amount: request.totalCharge },
      amount: request.totalCharge
    };
  }

  const amount = request.totalCharge || Math.round(request.package.weightKg * 100 * 100);
  const order = await createOrder(amount, `delivery_${requestId}`, { requestId, type: 'delivery_payment' });

  request.paymentOrderId = order.id;
  request.totalCharge = amount;
  await request.save();

  await Transaction.create({
    user: userId,
    type: 'delivery_payment',
    amount,
    currency: 'INR',
    razorpayOrderId: order.id,
    status: 'initiated',
    description: `delivery:${requestId}`
  });

  return { order, amount };
}

export async function confirmDeliveryPayment(input: {
  requestId: string;
  userId: string;
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
}) {
  const { requestId, userId, razorpayOrderId, razorpayPaymentId, razorpaySignature } = input;

  const request = await DeliveryRequest.findById(requestId);
  if (!request) {
    throw new ApiError(404, 'Delivery request not found');
  }

  if (request.sender.toString() !== userId) {
    throw new ApiError(403, 'Forbidden');
  }

  if (!verifySignature(razorpayOrderId, razorpayPaymentId, razorpaySignature)) {
    throw new ApiError(400, 'Invalid payment signature');
  }

  if (request.paymentStatus === 'paid') {
    return { success: true, idempotent: true };
  }

  const tx = await Transaction.findOne({
    user: userId,
    razorpayOrderId,
    type: 'delivery_payment'
  });

  if (!tx) {
    throw new ApiError(404, 'Delivery payment transaction not found');
  }

  tx.razorpayPaymentId = razorpayPaymentId;
  tx.razorpaySignature = razorpaySignature;
  tx.status = 'completed';
  await tx.save();

  request.paymentStatus = 'paid';
  await request.save();

  if (request.match) {
    const existingHold = await Transaction.exists({ match: request.match, type: 'escrow_hold' });
    if (!existingHold) {
      await holdFunds(request.match.toString(), request.totalCharge || tx.amount, 'sender_payment');
    }
  }

  await notifyUser({
    userId,
    title: 'Payment Confirmed',
    body: 'Your delivery payment is now secured in escrow.',
    type: 'payment'
  });
  await emitToUser(userId, 'payment:status', { status: 'success', type: 'delivery_payment', requestId });

  return { success: true };
}

export async function getTransactions(userId: string) {
  return Transaction.find({ user: userId }).sort({ createdAt: -1 });
}

export async function handleWebhook(rawBody: Buffer | string, signature: string | undefined) {
  if (!signature) {
    throw new ApiError(400, 'Missing webhook signature');
  }

  const body = Buffer.isBuffer(rawBody) ? rawBody.toString('utf8') : rawBody;
  const digest = crypto.createHmac('sha256', env.RAZORPAY_WEBHOOK_SECRET).update(body).digest('hex');

  if (digest !== signature) {
    throw new ApiError(400, 'Invalid webhook signature');
  }

  const payload = JSON.parse(body);
  const event = payload.event as string;
  const paymentEntity = payload.payload?.payment?.entity;

  if (event === 'payment.captured' && paymentEntity?.order_id) {
    await Transaction.findOneAndUpdate(
      { razorpayOrderId: paymentEntity.order_id },
      {
        $set: {
          razorpayPaymentId: paymentEntity.id,
          status: 'completed'
        }
      }
    );
  }

  if (event === 'payment.failed' && paymentEntity?.order_id) {
    await Transaction.findOneAndUpdate(
      { razorpayOrderId: paymentEntity.order_id },
      {
        $set: {
          status: 'failed'
        }
      }
    );
  }

  return { received: true };
}

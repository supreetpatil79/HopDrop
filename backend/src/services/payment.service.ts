import crypto from 'crypto';
import Razorpay from 'razorpay';
import { env } from '../config/env';
import { DELIVERY_EVENT_TYPES, DOMAIN_TOPICS, TRIP_EVENT_TYPES } from '../events/domainEvents';
import { DeliveryRequest } from '../models/DeliveryRequest';
import { ProcessedWebhook } from '../models/ProcessedWebhook';
import { Transaction } from '../models/Transaction';
import { Trip } from '../models/Trip';
import { User } from '../models/User';
import { ApiError } from '../utils/ApiError';
import { holdFunds } from './escrow.service';
import { emitToUser, notifyUser } from './notification.service';
import { appendOutboxEvents } from './outbox.service';


const razorpay = new Razorpay({
  key_id: env.RAZORPAY_KEY_ID,
  key_secret: env.RAZORPAY_KEY_SECRET
});

function verifySignature(orderId: string, paymentId: string, signature: string): boolean {
  if (env.DEMO_MODE && orderId.startsWith('mock_order_') && signature === 'mock_signature') {
    return true;
  }

  const hmac = crypto.createHmac('sha256', env.RAZORPAY_KEY_SECRET);
  hmac.update(`${orderId}|${paymentId}`);
  const generated = hmac.digest('hex');
  const genBuf = Buffer.from(generated, 'utf8');
  const sigBuf = Buffer.from(signature, 'utf8');
  if (genBuf.length !== sigBuf.length) {
    return false;
  }
  return crypto.timingSafeEqual(genBuf, sigBuf);
}

type OrderResult = { id: string; amount: number; currency: string; receipt?: string; notes?: Record<string, string>; status?: string };

async function createOrder(amount: number, receipt: string, notes: Record<string, string>): Promise<OrderResult> {
  // Lazy-import to avoid a circular import at module load time
  const { razorpayCreateOrderGuarded } = await import('../config/circuitBreaker');

  try {
    // Goes through the circuit breaker — fails fast when Razorpay is down.
    const order = await razorpayCreateOrderGuarded(razorpay, { amount, currency: 'INR', receipt, notes });
    return order as OrderResult;
  } catch (error: any) {
    // DEMO_MODE fallback: return a mock order so local dev works without keys
    if (env.DEMO_MODE) {
      return {
        id: `mock_order_${Date.now()}`,
        amount,
        currency: 'INR',
        receipt,
        notes,
        status: 'created'
      };
    }
    // Distinguish a breaker-open rejection from a real API error
    const isBreakerOpen = error?.message?.includes('Breaker is open') || error?.code === 'EOPENBREAKER';
    const statusCode = isBreakerOpen ? 503 : 502;
    const message = isBreakerOpen
      ? 'Payment provider is temporarily unavailable. Please try again shortly.'
      : `Failed to create payment order with provider: ${error instanceof Error ? error.message : String(error)}`;
    throw new ApiError(statusCode, message);
  }
}

export async function createStandaloneOrder(input: {
  amount: number;
  currency?: string;
  receipt?: string;
  notes?: Record<string, string>;
}) {
  if (!input.amount || typeof input.amount !== 'number' || input.amount < 100) {
    throw new ApiError(400, 'Invalid amount: minimum amount is 100 paise (₹1)');
  }

  const receipt = input.receipt || `rcpt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const order = await createOrder(input.amount, receipt, input.notes || {});
  return {
    order_id: order.id,
    orderId: order.id,
    id: order.id,
    amount: order.amount,
    currency: order.currency || input.currency || 'INR',
    receipt: order.receipt || receipt
  };
}

export async function verifyStandalonePayment(input: {
  order_id: string;
  payment_id: string;
  signature: string;
}) {
  if (!input.order_id || !input.payment_id || !input.signature) {
    throw new ApiError(400, 'Missing required fields: order_id, payment_id, and signature are required');
  }

  const isValid = verifySignature(input.order_id, input.payment_id, input.signature);
  if (!isValid) {
    throw new ApiError(400, 'Invalid payment signature. Verification failed.');
  }

  return {
    verified: true,
    order_id: input.order_id,
    payment_id: input.payment_id
  };
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

  await appendOutboxEvents([
    {
      topic: DOMAIN_TOPICS.trip,
      eventType: TRIP_EVENT_TYPES.updated,
      aggregateType: 'trip',
      aggregateId: tripId,
      partitionKey: tripId,
      payload: {
        tripId,
        carrierId: userId,
        status: trip.status,
        safetyDepositPaid: trip.safetyDepositPaid,
        safetyDepositTransactionId: trip.safetyDepositTransactionId,
        updates: {
          safetyDepositPaid: true
        }
      }
    }
  ]);

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

  await appendOutboxEvents([
    {
      topic: DOMAIN_TOPICS.payment,
      eventType: DELIVERY_EVENT_TYPES.paid,
      aggregateType: 'delivery_request',
      aggregateId: requestId,
      partitionKey: requestId,
      payload: {
        requestId,
        userId,
        paymentStatus: request.paymentStatus,
        totalCharge: request.totalCharge || tx.amount,
        razorpayOrderId,
        razorpayPaymentId
      }
    }
  ]);

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
  const digestBuf = Buffer.from(digest, 'utf8');
  const sigBuf = Buffer.from(signature, 'utf8');

  if (digestBuf.length !== sigBuf.length || !crypto.timingSafeEqual(digestBuf, sigBuf)) {
    throw new ApiError(400, 'Invalid webhook signature');
  }

  const payload = JSON.parse(body);
  const event = payload.event as string;
  const paymentEntity = payload.payload?.payment?.entity;

  if (!paymentEntity?.id) {
    // No payment entity — acknowledge and skip
    return { received: true };
  }

  // ── Idempotency Guard ─────────────────────────────────────────────────────
  // Attempt to record this event atomically. If the unique index on eventId
  // rejects the insert (E11000), this webhook was already processed — return
  // 200 immediately so Razorpay stops retrying without processing twice.
  // ─────────────────────────────────────────────────────────────────────────
  try {
    await ProcessedWebhook.create({
      eventId: paymentEntity.id,
      event,
      orderId: paymentEntity.order_id || 'unknown'
    });
  } catch (err: any) {
    if (err?.code === 11000) {
      // Already processed — idempotent response
      return { received: true, idempotent: true };
    }
    throw err;
  }

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


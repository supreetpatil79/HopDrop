/* eslint-disable @typescript-eslint/no-explicit-any */
import CircuitBreaker from 'opossum';
import mongoose from 'mongoose';
import Razorpay from 'razorpay';
import { logger } from '../observability/logger';

// ─────────────────────────────────────────────────────────────────────────────
// MongoDB Circuit Breaker
// Opens after 50% error rate over 3+ calls; recovers after 10s half-open probe.
// ─────────────────────────────────────────────────────────────────────────────

async function mongoConnect(uri: string): Promise<typeof mongoose> {
  return mongoose.connect(uri);
}

export const dbCircuitBreaker = new CircuitBreaker(mongoConnect, {
  name: 'mongodb',
  errorThresholdPercentage: 50,
  resetTimeout: 10_000,
  timeout: 8_000,
  volumeThreshold: 3
});

dbCircuitBreaker.on('open', () => {
  logger.error({ breaker: 'mongodb' }, 'circuit_breaker_open — DB is unreachable. Rejecting new requests.');
});
dbCircuitBreaker.on('halfOpen', () => {
  logger.warn({ breaker: 'mongodb' }, 'circuit_breaker_half_open — Testing DB recovery.');
});
dbCircuitBreaker.on('close', () => {
  logger.info({ breaker: 'mongodb' }, 'circuit_breaker_closed — DB recovered.');
});
dbCircuitBreaker.on('fallback', (result) => {
  logger.error({ breaker: 'mongodb', result }, 'circuit_breaker_fallback — Request rejected due to open circuit.');
});

// Mongoose-level live disconnect detection
mongoose.connection.on('disconnected', () => {
  logger.error({ event: 'mongo_disconnected' }, 'MongoDB connection lost');
});
mongoose.connection.on('reconnected', () => {
  logger.info({ event: 'mongo_reconnected' }, 'MongoDB connection restored');
});

// ─────────────────────────────────────────────────────────────────────────────
// Razorpay Circuit Breaker
//
// Wraps razorpay.orders.create so that if Razorpay's API is slow or down:
//   - After 3 failures within the rolling window, the breaker opens.
//   - Open state rejects calls instantly — no hanging HTTP timeouts.
//   - After 15s it enters half-open and lets one probe through.
//   - Closes again when Razorpay is stable.
// ─────────────────────────────────────────────────────────────────────────────

export type RazorpayOrderParams = {
  amount: number;
  currency: string;
  receipt: string;
  notes: Record<string, string>;
};

// opossum ships without bundled TS typings so fire() resolves to void in
// strict mode. We hide that behind a properly-typed exported helper so
// callers never need to deal with casts.
const _razorpayBreaker: CircuitBreaker = new CircuitBreaker(
  async (client: Razorpay, params: RazorpayOrderParams): Promise<any> => {
    return client.orders.create(params as any);
  },
  {
    name: 'razorpay',
    errorThresholdPercentage: 50,
    resetTimeout: 15_000,
    // Razorpay's P99 is well under 5s — treat anything longer as degraded
    timeout: 6_000,
    volumeThreshold: 3
  }
);

_razorpayBreaker.on('open', () => {
  logger.error({ breaker: 'razorpay' }, 'circuit_breaker_open — Razorpay unreachable. Rejecting payment creation.');
});
_razorpayBreaker.on('halfOpen', () => {
  logger.warn({ breaker: 'razorpay' }, 'circuit_breaker_half_open — Probing Razorpay recovery.');
});
_razorpayBreaker.on('close', () => {
  logger.info({ breaker: 'razorpay' }, 'circuit_breaker_closed — Razorpay recovered.');
});
_razorpayBreaker.on('fallback', () => {
  logger.error({ breaker: 'razorpay' }, 'circuit_breaker_fallback — Order creation blocked by open circuit.');
});

/**
 * Call razorpay.orders.create through the circuit breaker.
 * Fails fast when Razorpay is unreachable instead of blocking for 6s.
 */
export async function razorpayCreateOrderGuarded(
  client: Razorpay,
  params: RazorpayOrderParams
): Promise<any> {
  return (_razorpayBreaker.fire(client, params) as unknown);
}

import CircuitBreaker from 'opossum';
import mongoose from 'mongoose';
import { logger } from '../observability/logger';

// ─── Circuit Breaker Options ───────────────────────────────────────────────
// - errorThresholdPercentage: open after 50% of calls fail in the rolling window
// - resetTimeout: after 10s in OPEN state, try half-open
// - timeout: if mongoose.connect() hangs > 8s, treat as failure
// ─────────────────────────────────────────────────────────────────────────────

const options = {
  errorThresholdPercentage: 50,
  resetTimeout: 10_000,
  timeout: 8_000,
  volumeThreshold: 3,
  name: 'mongodb'
};

async function mongoConnect(uri: string): Promise<typeof mongoose> {
  return mongoose.connect(uri);
}

export const dbCircuitBreaker = new CircuitBreaker(mongoConnect, options);

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

// ─── Mongoose-level event listeners for live disconnect detection ─────────
mongoose.connection.on('disconnected', () => {
  logger.error({ event: 'mongo_disconnected' }, 'MongoDB connection lost');
});

mongoose.connection.on('reconnected', () => {
  logger.info({ event: 'mongo_reconnected' }, 'MongoDB connection restored');
});

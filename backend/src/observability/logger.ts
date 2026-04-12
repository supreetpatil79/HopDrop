import pino from 'pino';
import { env } from '../config/env';

export const logger = pino({
  level: env.LOG_LEVEL,
  base: {
    service: 'core-api',
    env: env.NODE_ENV
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'headers.authorization',
      'headers.cookie',
      'body.accessToken',
      'body.refreshToken',
      'body.otp',
      'body.razorpaySignature',
      'payload.refreshToken',
      'payload.otp'
    ],
    censor: '[REDACTED]'
  }
});

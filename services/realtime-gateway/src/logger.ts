import pino from 'pino';
import { env } from './config';

export const logger = pino({
  level: env.LOG_LEVEL,
  base: {
    service: 'realtime-gateway',
    env: env.NODE_ENV
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  redact: {
    paths: ['headers.authorization', 'auth.token'],
    censor: '[REDACTED]'
  }
});

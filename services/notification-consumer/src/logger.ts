import pino from 'pino';
import { env } from './config';

export const logger = pino({
  level: env.NOTIFICATION_CONSUMER_LOG_LEVEL,
  base: {
    service: 'notification-consumer',
    env: env.NODE_ENV
  },
  timestamp: pino.stdTimeFunctions.isoTime
});

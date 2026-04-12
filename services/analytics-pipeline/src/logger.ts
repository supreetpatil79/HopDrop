import pino from 'pino';
import { env } from './config';

export const logger = pino({
  level: env.ANALYTICS_PIPELINE_LOG_LEVEL,
  base: {
    service: 'analytics-pipeline',
    env: env.NODE_ENV
  },
  timestamp: pino.stdTimeFunctions.isoTime
});

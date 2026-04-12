import pino from 'pino';
import { env } from './config';

export const logger = pino({
  level: env.MATCHING_ORCHESTRATOR_LOG_LEVEL,
  base: {
    service: 'matching-orchestrator',
    env: env.NODE_ENV
  },
  timestamp: pino.stdTimeFunctions.isoTime
});

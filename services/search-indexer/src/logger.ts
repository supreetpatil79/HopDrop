import pino from 'pino';
import { env } from './config';

export const logger = pino({
  level: env.SEARCH_INDEXER_LOG_LEVEL,
  base: {
    service: 'search-indexer',
    env: env.NODE_ENV
  },
  timestamp: pino.stdTimeFunctions.isoTime
});

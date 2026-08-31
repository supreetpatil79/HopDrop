import mongoose from 'mongoose';
import { env } from './env';
import { dbCircuitBreaker } from './circuitBreaker';
import { logger } from '../observability/logger';

const MAX_RETRIES = 5;

export async function connectDB(): Promise<void> {
  let retries = 0;

  while (retries < MAX_RETRIES) {
    try {
      await dbCircuitBreaker.fire(env.MONGODB_URI);
      logger.info({ attempt: retries + 1 }, 'mongodb_connected');
      return;
    } catch (error) {
      retries += 1;
      logger.warn({ retries, error: error instanceof Error ? error.message : String(error) }, 'mongodb_connect_retry');
      if (retries >= MAX_RETRIES) {
        logger.error({ retries }, 'mongodb_connect_failed_max_retries');
        throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, 1500 * retries));
    }
  }
}


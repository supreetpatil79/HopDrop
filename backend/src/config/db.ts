import mongoose from 'mongoose';
import { env } from './env';
import { dbCircuitBreaker } from './circuitBreaker';
import { logger } from '../observability/logger';

const MAX_RETRIES = 5;

export async function connectDB(): Promise<void> {
  const isServerless = process.env.VERCEL === '1' || Boolean(process.env.AWS_LAMBDA_FUNCTION_NAME);
  const maxRetries = isServerless ? 1 : MAX_RETRIES;
  let retries = 0;

  const mongooseOptions = {
    maxPoolSize: isServerless ? 5 : 10,
    minPoolSize: isServerless ? 1 : 2,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
    connectTimeoutMS: 10000,
    heartbeatFrequencyMS: 10000
  };

  while (retries < maxRetries) {
    try {
      await dbCircuitBreaker.fire(env.MONGODB_URI, mongooseOptions);
      logger.info({ attempt: retries + 1 }, 'mongodb_connected');
      return;
    } catch (error) {
      retries += 1;
      logger.warn({ retries, error: error instanceof Error ? error.message : String(error) }, 'mongodb_connect_retry');
      if (retries >= maxRetries) {
        logger.error({ retries }, 'mongodb_connect_failed_max_retries');
        if (isServerless) {
          console.warn('⚠️ Serverless MongoDB connection failed, continuing in decoupled/mock mode');
          return;
        }
        throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, 1500 * retries));
    }
  }
}


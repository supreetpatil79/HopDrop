import mongoose from 'mongoose';
import { env } from './env';

const MAX_RETRIES = 5;

export async function connectDB(): Promise<void> {
  let retries = 0;

  while (retries < MAX_RETRIES) {
    try {
      await mongoose.connect(env.MONGODB_URI);
      return;
    } catch (error) {
      retries += 1;
      if (retries >= MAX_RETRIES) {
        throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, 1500 * retries));
    }
  }
}

import app from '../src/app';
import { connectDB } from '../src/config/db';

let isConnected = false;

export default async function handler(req: any, res: any) {
  if (!isConnected) {
    try {
      await connectDB();
      isConnected = true;
    } catch (err) {
      console.error('Failed to connect to database in serverless handler:', err);
    }
  }
  return app(req, res);
}

import app from '../src/app';
import { connectDB } from '../src/config/db';

let isConnected = false;

export default async function handler(req: any, res: any) {
  const origin = req.headers.origin || '*';
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization, X-Request-Id, X-Client-App'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (!isConnected) {
    try {
      await connectDB();
      isConnected = true;
    } catch (err) {
      console.warn('Failed to connect to database in serverless handler:', err);
    }
  }

  try {
    return app(req, res);
  } catch (err: any) {
    console.error('Unhandled serverless request error:', err);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      ...(process.env.NODE_ENV === 'development' && { error: err?.message || String(err) })
    });
  }
}

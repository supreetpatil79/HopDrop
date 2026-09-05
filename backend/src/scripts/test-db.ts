import dotenv from 'dotenv';
import path from 'path';
import mongoose from 'mongoose';

// Load .env from backend directory and repo root
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

function sanitizeMongoUri(uri: string): string {
  try {
    return uri.replace(/:\/\/([^:]+):([^@]+)@/, '://$1:****@');
  } catch {
    return 'mongodb+srv://[masked]';
  }
}

async function run() {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    console.error('❌ MONGODB_URI is not set in process.env or .env file');
    process.exit(1);
  }

  const masked = sanitizeMongoUri(uri);
  console.log(`Connecting to MongoDB Atlas at: ${masked}`);

  if (uri.includes('YOUR_PASSWORD')) {
    console.warn('⚠️ Notice: "YOUR_PASSWORD" placeholder is still in MONGODB_URI. Replace it with your actual MongoDB Atlas user password in .env.');
    process.exit(2);
  }

  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 10000
    });

    console.log('✅ Connected to MongoDB Atlas successfully!');
    if (mongoose.connection.db) {
      const pingResult = await mongoose.connection.db.admin().ping();
      console.log('✅ Database Ping Result:', pingResult);
      console.log(`✅ Connected Database Name: "${mongoose.connection.db.databaseName}"`);
    }

    await mongoose.disconnect();
    console.log('Connection closed cleanly.');
    process.exit(0);
  } catch (error: any) {
    console.error('❌ MongoDB Connection Error:', error?.message ? error.message.replace(/:[^@]+@/, ':****@') : 'Connection failed');
    process.exit(1);
  }
}

run();

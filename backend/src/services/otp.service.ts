import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { redis } from '../config/redis';
import { ApiError } from '../utils/ApiError';

const OTP_TTL_SECONDS = 600;
const MAX_ATTEMPTS = 3;

export async function generateOTP(key: string): Promise<string> {
  const otp = crypto.randomInt(100000, 999999).toString();
  const hash = await bcrypt.hash(otp, 10);

  await redis.setex(
    `otp:${key}`,
    OTP_TTL_SECONDS,
    JSON.stringify({
      hash,
      attempts: 0,
      createdAt: Date.now()
    })
  );

  return otp;
}

export async function verifyOTP(key: string, inputOtp: string): Promise<boolean> {
  const raw = await redis.get(`otp:${key}`);
  if (!raw) {
    throw new ApiError(400, 'OTP expired or not found');
  }

  const { hash, attempts } = JSON.parse(raw) as { hash: string; attempts: number; createdAt: number };
  if (attempts >= MAX_ATTEMPTS) {
    throw new ApiError(429, 'Too many attempts. Request new OTP');
  }

  await redis.setex(
    `otp:${key}`,
    OTP_TTL_SECONDS,
    JSON.stringify({
      hash,
      attempts: attempts + 1,
      createdAt: Date.now()
    })
  );

  const isValid = await bcrypt.compare(inputOtp, hash);
  if (!isValid) {
    throw new ApiError(400, `Invalid OTP. ${MAX_ATTEMPTS - attempts - 1} attempts left`);
  }

  await redis.del(`otp:${key}`);
  return true;
}

export const otpKeys = {
  phone: (phone: string) => `phone:${phone}`,
  pickup: (matchId: string) => `pickup:${matchId}`,
  delivery: (matchId: string) => `delivery:${matchId}`
};

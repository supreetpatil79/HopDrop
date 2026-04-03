import crypto from 'crypto';
import { env } from '../config/env';
import { Transaction } from '../models/Transaction';
import { User } from '../models/User';
import { ApiError } from '../utils/ApiError';

const ENCRYPTION_ALGO = 'aes-256-cbc';
const ENCRYPTION_KEY = crypto.createHash('sha256').update(env.JWT_ACCESS_SECRET).digest();
const IV = Buffer.alloc(16, 0);

function encryptLast4(value: string) {
  const cipher = crypto.createCipheriv(ENCRYPTION_ALGO, ENCRYPTION_KEY, IV);
  return Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]).toString('hex');
}

export async function getMyProfile(userId: string) {
  const user = await User.findById(userId).select('-refreshTokenHash');
  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  return user;
}

export async function updateMyProfile(userId: string, payload: { name?: string; email?: string; profilePhoto?: string }) {
  const user = await User.findByIdAndUpdate(userId, payload, { new: true }).select('-refreshTokenHash');
  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  return user;
}

export async function verifyGovernmentId(
  userId: string,
  payload: {
    governmentIdType: 'aadhaar' | 'pan' | 'passport' | 'dl';
    governmentIdNumber: string;
  }
) {
  const last4 = payload.governmentIdNumber.slice(-4);
  const encryptedLast4 = encryptLast4(last4);

  const user = await User.findByIdAndUpdate(
    userId,
    {
      governmentIdVerified: true,
      governmentIdType: payload.governmentIdType,
      governmentIdLast4: encryptedLast4
    },
    { new: true }
  ).select('-refreshTokenHash');

  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  return user;
}

export async function getWallet(userId: string) {
  const user = await User.findById(userId).select('wallet');
  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  const transactions = await Transaction.find({ user: userId }).sort({ createdAt: -1 }).limit(100);

  return {
    balance: user.wallet.balance,
    escrowHeld: user.wallet.escrowHeld,
    transactions
  };
}

export async function getPublicProfile(userId: string) {
  const user = await User.findById(userId).select('name profilePhoto rating totalDeliveries totalTripsAsCarrier');
  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  return {
    _id: user._id,
    name: user.name,
    profilePhoto: user.profilePhoto,
    rating: user.rating,
    totalDeliveries: user.totalDeliveries,
    totalTripsAsCarrier: user.totalTripsAsCarrier
  };
}

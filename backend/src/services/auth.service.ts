import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import axios from 'axios';
import { Types } from 'mongoose';
import { env } from '../config/env';
import { User } from '../models/User';
import { ApiError } from '../utils/ApiError';
import { generateOTP, otpKeys, verifyOTP } from './otp.service';

interface TokenPayload {
  id: string;
  phone: string;
  roles: string[];
}

function sanitizeUser(user: any) {
  return {
    _id: user._id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    phoneVerified: user.phoneVerified,
    emailVerified: user.emailVerified,
    role: user.role,
    rating: user.rating,
    wallet: user.wallet,
    profilePhoto: user.profilePhoto,
    totalDeliveries: user.totalDeliveries,
    totalTripsAsCarrier: user.totalTripsAsCarrier
  };
}

async function sendSmsOTP(phone: string, otp: string): Promise<void> {
  if (env.MSG91_AUTH_KEY && env.MSG91_TEMPLATE_ID) {
    await axios.post(
      'https://control.msg91.com/api/v5/otp',
      {
        mobile: `91${phone}`,
        otp,
        template_id: env.MSG91_TEMPLATE_ID
      },
      {
        headers: {
          authkey: env.MSG91_AUTH_KEY
        }
      }
    );
    return;
  }

  // eslint-disable-next-line no-console
  console.log(`OTP for ${phone}: ${otp}`);
}

async function issueTokens(userId: Types.ObjectId | string) {
  const user = await User.findById(userId);
  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  const payload: TokenPayload = {
    id: user._id.toString(),
    phone: user.phone,
    roles: user.role
  };

  const accessToken = jwt.sign(payload, env.JWT_ACCESS_SECRET, { expiresIn: env.JWT_ACCESS_EXPIRY as jwt.SignOptions['expiresIn'] });
  const refreshToken = jwt.sign(payload, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRY as jwt.SignOptions['expiresIn']
  });

  user.refreshTokenHash = await bcrypt.hash(refreshToken, 10);
  await user.save();

  return { accessToken, refreshToken, user: sanitizeUser(user) };
}

export async function sendOtp(phone: string) {
  const otp = await generateOTP(otpKeys.phone(phone));
  await sendSmsOTP(phone, otp);
  return { sent: true };
}

export async function verifyOtpLogin(phone: string, otp: string) {
  await verifyOTP(otpKeys.phone(phone), otp);
  const user = await User.findOne({ phone, isActive: true });
  if (!user) {
    throw new ApiError(404, 'User not found. Please register.');
  }

  return issueTokens(user._id);
}

export async function registerUser(input: { name: string; email: string; phone: string; otp: string }) {
  await verifyOTP(otpKeys.phone(input.phone), input.otp);

  const existing = await User.findOne({ $or: [{ phone: input.phone }, { email: input.email }] });
  if (existing) {
    throw new ApiError(409, 'User already exists with provided phone/email');
  }

  const user = await User.create({
    name: input.name,
    email: input.email,
    phone: input.phone,
    phoneVerified: true,
    role: ['sender']
  });

  return issueTokens(user._id);
}

export async function refreshAuthToken(refreshToken: string) {
  let payload: TokenPayload;
  try {
    payload = jwt.verify(refreshToken, env.JWT_REFRESH_SECRET) as TokenPayload;
  } catch (_error) {
    throw new ApiError(401, 'Invalid refresh token');
  }

  const user = await User.findById(payload.id);
  if (!user || !user.refreshTokenHash) {
    throw new ApiError(401, 'Invalid refresh token');
  }

  const isMatch = await bcrypt.compare(refreshToken, user.refreshTokenHash);
  if (!isMatch) {
    throw new ApiError(401, 'Refresh token revoked');
  }

  return issueTokens(user._id);
}

export async function logoutUser(userId: string) {
  await User.findByIdAndUpdate(userId, { $unset: { refreshTokenHash: 1 } });
  return { loggedOut: true };
}

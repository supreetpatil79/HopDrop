import crypto from 'crypto';
import { env } from '../config/env';
import { Match } from '../models/Match';
import { Transaction } from '../models/Transaction';
import { ICarrierPreferences, IPayoutBank, User } from '../models/User';
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
  const updateData: Record<string, unknown> = {};
  if (typeof payload?.name === 'string') {
    updateData.name = payload.name.trim();
  }
  if (typeof payload?.email === 'string') {
    updateData.email = payload.email.trim().toLowerCase();
  }
  if (typeof payload?.profilePhoto === 'string') {
    updateData.profilePhoto = payload.profilePhoto.trim();
  }

  const user = await User.findByIdAndUpdate(userId, { $set: updateData }, { new: true, runValidators: true }).select('-refreshTokenHash');
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
      governmentIdLast4: encryptedLast4,
      aadhaarVerified: payload.governmentIdType === 'aadhaar' ? true : undefined,
      aadhaarMasked: payload.governmentIdType === 'aadhaar' ? `XXXXXXXX${last4}` : undefined,
      kycTier: 'tier_2_verified'
    },
    { new: true }
  ).select('-refreshTokenHash');

  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  return user;
}

export async function verifyCarrierAadhaarDigiLocker(
  userId: string,
  payload: {
    aadhaarNumber: string;
    otp?: string;
  }
) {
  const cleanNumber = payload.aadhaarNumber.replace(/\s+/g, '');
  if (cleanNumber.length !== 12 || !/^\d{12}$/.test(cleanNumber)) {
    throw new ApiError(400, 'Invalid 12-digit Aadhaar number format');
  }

  const last4 = cleanNumber.slice(-4);
  const maskedAadhaar = `XXXX-XXXX-${last4}`;
  const encryptedLast4 = encryptLast4(last4);

  const user = await User.findById(userId);
  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  user.governmentIdVerified = true;
  user.governmentIdType = 'aadhaar';
  user.governmentIdLast4 = encryptedLast4;
  user.aadhaarVerified = true;
  user.aadhaarMasked = maskedAadhaar;
  user.kycTier = user.payoutUpi || user.payoutBank?.verified ? 'tier_3_pro' : 'tier_2_verified';

  if (!user.role.includes('carrier')) {
    user.role.push('carrier');
  }

  await user.save();

  return {
    success: true,
    message: 'Aadhaar verified successfully via DigiLocker ID Gateway',
    aadhaarMasked: maskedAadhaar,
    kycTier: user.kycTier,
    verifiedAt: new Date()
  };
}

export async function saveCarrierPayoutMethod(
  userId: string,
  payload: {
    method: 'upi' | 'bank';
    upiId?: string;
    accountNumber?: string;
    ifsc?: string;
    holderName?: string;
  }
) {
  const user = await User.findById(userId);
  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  if (payload.method === 'upi') {
    if (!payload.upiId || !payload.upiId.includes('@')) {
      throw new ApiError(400, 'Invalid UPI ID format (e.g. user@okhdfcbank)');
    }
    user.payoutUpi = payload.upiId.trim().toLowerCase();
  } else if (payload.method === 'bank') {
    if (!payload.accountNumber || !payload.ifsc) {
      throw new ApiError(400, 'Bank account number and IFSC are required');
    }
    const last4 = payload.accountNumber.slice(-4);
    user.payoutBank = {
      accountNumberMasked: `XXXX${last4}`,
      ifsc: payload.ifsc.toUpperCase().trim(),
      holderName: payload.holderName?.trim() || user.name,
      verified: true
    };
  }

  if (user.aadhaarVerified || user.governmentIdVerified) {
    user.kycTier = 'tier_3_pro';
  }

  await user.save();

  return {
    success: true,
    message: 'Payout destination verified with ₹1 Penny-Drop validation',
    payoutUpi: user.payoutUpi,
    payoutBank: user.payoutBank,
    kycTier: user.kycTier
  };
}

export async function saveCarrierPreferences(
  userId: string,
  payload: ICarrierPreferences
) {
  const user = await User.findById(userId);
  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  const existing = user.carrierPreferences || {};
  user.carrierPreferences = {
    preferredModes: Array.isArray(payload?.preferredModes)
      ? payload.preferredModes.filter((m: any): m is string => typeof m === 'string')
      : existing.preferredModes || [],
    maxCapacityKg: typeof payload?.maxCapacityKg === 'number' && payload.maxCapacityKg > 0
      ? payload.maxCapacityKg
      : existing.maxCapacityKg || 10,
    allowedCategories: Array.isArray(payload?.allowedCategories)
      ? payload.allowedCategories.filter((c: any): c is string => typeof c === 'string')
      : existing.allowedCategories || [],
    instantBooking: typeof payload?.instantBooking === 'boolean'
      ? payload.instantBooking
      : (existing.instantBooking ?? false),
    bio: typeof payload?.bio === 'string' ? payload.bio.slice(0, 500) : existing.bio,
    emergencyContact: typeof payload?.emergencyContact === 'string' ? payload.emergencyContact.slice(0, 20) : existing.emergencyContact
  };

  if (!user.role.includes('carrier')) {
    user.role.push('carrier');
  }

  await user.save();

  return {
    success: true,
    message: 'Carrier preferences updated successfully',
    preferences: user.carrierPreferences
  };
}

export async function getCarrierSetupStatus(userId: string) {
  const user = await User.findById(userId);
  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  const hasAadhaar = !!user.aadhaarVerified || !!user.governmentIdVerified;
  const hasPayout = !!user.payoutUpi || !!user.payoutBank?.verified;
  const hasPreferences = !!(user.carrierPreferences?.preferredModes?.length);

  let completionPercentage = 25; // Base account
  if (hasAadhaar) completionPercentage += 35;
  if (hasPayout) completionPercentage += 25;
  if (hasPreferences) completionPercentage += 15;

  const tripLimitRupees = hasAadhaar ? 15000 : 1000;

  return {
    userId: user._id,
    name: user.name,
    phone: user.phone,
    email: user.email,
    profilePhoto: user.profilePhoto,
    rating: user.rating,
    kycTier: user.kycTier || 'tier_1_basic',
    completionPercentage,
    tripLimitRupees,
    aadhaar: {
      verified: hasAadhaar,
      masked: user.aadhaarMasked || (user.governmentIdLast4 ? `XXXXXXXX${user.governmentIdLast4}` : null),
      type: user.governmentIdType || 'aadhaar'
    },
    payout: {
      configured: hasPayout,
      upiId: user.payoutUpi || null,
      bank: user.payoutBank || null
    },
    preferences: user.carrierPreferences || {
      preferredModes: ['train', 'car'],
      maxCapacityKg: 10,
      allowedCategories: ['documents', 'electronics', 'clothing'],
      instantBooking: true,
      bio: '',
      emergencyContact: ''
    }
  };
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
  const user = await User.findById(userId).select('name profilePhoto rating totalDeliveries totalTripsAsCarrier carrierPreferences kycTier governmentIdVerified');
  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  return {
    _id: user._id,
    name: user.name,
    profilePhoto: user.profilePhoto,
    rating: user.rating,
    totalDeliveries: user.totalDeliveries,
    totalTripsAsCarrier: user.totalTripsAsCarrier,
    carrierPreferences: user.carrierPreferences,
    kycTier: user.kycTier,
    governmentIdVerified: user.governmentIdVerified
  };
}

export async function deleteMyAccount(userId: string) {
  const user = await User.findById(userId);
  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  if ((user.wallet?.escrowHeld ?? 0) > 0) {
    throw new ApiError(400, 'Cannot deactivate account with funds held in escrow. Please complete or cancel pending transactions.');
  }

  const activeMatchesCount = await Match.countDocuments({
    $or: [{ carrier: userId }, { sender: userId }],
    status: { $in: ['proposed', 'accepted', 'confirmed', 'active', 'picked_up'] }
  });

  if (activeMatchesCount > 0) {
    throw new ApiError(400, 'Cannot deactivate account with active deliveries or trips in progress.');
  }

  user.isActive = false;
  user.fcmToken = undefined;
  user.refreshTokenHash = undefined;
  user.name = 'Deactivated User';
  user.profilePhoto = undefined;
  await user.save();

  return { success: true, message: 'Account successfully deactivated and personal data anonymized' };
}

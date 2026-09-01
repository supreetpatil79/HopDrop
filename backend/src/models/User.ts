import { HydratedDocument, Model, Schema, model } from 'mongoose';

export interface ICarrierPreferences {
  preferredModes?: string[];
  maxCapacityKg?: number;
  allowedCategories?: string[];
  instantBooking?: boolean;
  bio?: string;
  emergencyContact?: string;
}

export interface IPayoutBank {
  accountNumberMasked?: string;
  ifsc?: string;
  verified: boolean;
  holderName?: string;
}

export interface IUser {
  name: string;
  email: string;
  phone: string;
  phoneVerified: boolean;
  emailVerified: boolean;
  passwordHash?: string;
  profilePhoto?: string;
  role: Array<'sender' | 'carrier' | 'admin'>;
  rating: {
    average: number;
    count: number;
  };
  wallet: {
    balance: number;
    escrowHeld: number;
  };
  governmentIdVerified: boolean;
  governmentIdType?: 'aadhaar' | 'pan' | 'passport' | 'dl';
  governmentIdLast4?: string;
  aadhaarVerified?: boolean;
  aadhaarMasked?: string;
  payoutUpi?: string;
  payoutBank?: IPayoutBank;
  carrierPreferences?: ICarrierPreferences;
  kycTier?: 'tier_1_basic' | 'tier_2_verified' | 'tier_3_pro';
  totalDeliveries: number;
  totalTripsAsCarrier: number;
  isActive: boolean;
  refreshTokenHash?: string;
  fcmToken?: string;
  createdAt: Date;
  updatedAt: Date;
}

export type UserDocument = HydratedDocument<IUser>;
export type UserModel = Model<IUser>;

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    phone: { type: String, required: true, unique: true },
    phoneVerified: { type: Boolean, default: false },
    emailVerified: { type: Boolean, default: false },
    passwordHash: { type: String },
    profilePhoto: { type: String },
    role: {
      type: [String],
      enum: ['sender', 'carrier', 'admin'],
      default: ['sender']
    },
    rating: {
      average: { type: Number, default: 5.0 },
      count: { type: Number, default: 0 }
    },
    wallet: {
      balance: { type: Number, default: 0 },
      escrowHeld: { type: Number, default: 0 }
    },
    governmentIdVerified: { type: Boolean, default: false },
    governmentIdType: { type: String, enum: ['aadhaar', 'pan', 'passport', 'dl'] },
    governmentIdLast4: { type: String },
    aadhaarVerified: { type: Boolean, default: false },
    aadhaarMasked: { type: String },
    payoutUpi: { type: String },
    payoutBank: {
      accountNumberMasked: { type: String },
      ifsc: { type: String },
      verified: { type: Boolean, default: false },
      holderName: { type: String }
    },
    carrierPreferences: {
      preferredModes: { type: [String], default: ['train', 'car'] },
      maxCapacityKg: { type: Number, default: 10 },
      allowedCategories: { type: [String], default: ['documents', 'electronics', 'clothing'] },
      instantBooking: { type: Boolean, default: true },
      bio: { type: String, default: '' },
      emergencyContact: { type: String, default: '' }
    },
    kycTier: {
      type: String,
      enum: ['tier_1_basic', 'tier_2_verified', 'tier_3_pro'],
      default: 'tier_1_basic'
    },
    totalDeliveries: { type: Number, default: 0 },
    totalTripsAsCarrier: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    refreshTokenHash: { type: String },
    fcmToken: { type: String }
  },
  { timestamps: true }
);

export const User = model<IUser, UserModel>('User', UserSchema);

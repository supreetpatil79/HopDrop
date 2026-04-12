import { HydratedDocument, Model, Schema, model } from 'mongoose';

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
    totalDeliveries: { type: Number, default: 0 },
    totalTripsAsCarrier: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    refreshTokenHash: { type: String },
    fcmToken: { type: String }
  },
  { timestamps: true }
);

export const User = model<IUser, UserModel>('User', UserSchema);

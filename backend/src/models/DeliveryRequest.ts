import { HydratedDocument, Model, Schema, Types, model } from 'mongoose';
import { ILocation } from './Trip';

export interface IDeliveryRequest {
  _id?: Types.ObjectId;
  sender: Types.ObjectId;
  origin: ILocation;
  destination: ILocation;
  package: {
    description: string;
    category: 'documents' | 'clothing' | 'electronics' | 'food' | 'fragile' | 'medicine' | 'other';
    weightKg: number;
    dimensionsCm?: { length?: number; width?: number; height?: number };
    isFragile: boolean;
    declaredValue?: number;
    photoUrl?: string;
  };
  recipient: {
    name: string;
    phone: string;
    address: string;
  };
  preferredDeliveryWindow: {
    earliest: Date;
    latest: Date;
  };
  status:
    | 'pending'
    | 'matched'
    | 'pickup_otp_sent'
    | 'picked_up'
    | 'in_transit'
    | 'delivery_otp_sent'
    | 'delivered'
    | 'cancelled'
    | 'expired';
  quotedPrice?: number;
  platformFee?: number;
  totalCharge?: number;
  match?: Types.ObjectId;
  paymentOrderId?: string;
  paymentStatus: 'unpaid' | 'paid' | 'refunded' | 'partial_refund';
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type DeliveryRequestDocument = HydratedDocument<IDeliveryRequest>;
export type DeliveryRequestModel = Model<IDeliveryRequest>;

const pointSchema = new Schema(
  {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: { type: [Number], default: undefined }
  },
  { _id: false }
);

const DeliveryRequestSchema = new Schema<IDeliveryRequest>(
  {
    sender: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    origin: {
      city: String,
      state: String,
      coordinates: { type: pointSchema, default: undefined },
      placeId: String,
      fullAddress: String
    },
    destination: {
      city: String,
      state: String,
      coordinates: { type: pointSchema, default: undefined },
      placeId: String,
      fullAddress: String
    },
    package: {
      description: { type: String, required: true },
      category: {
        type: String,
        enum: ['documents', 'clothing', 'electronics', 'food', 'fragile', 'medicine', 'other'],
        required: true
      },
      weightKg: { type: Number, required: true },
      dimensionsCm: { length: Number, width: Number, height: Number },
      isFragile: { type: Boolean, default: false },
      declaredValue: { type: Number },
      photoUrl: { type: String }
    },
    recipient: {
      name: { type: String, required: true },
      phone: { type: String, required: true },
      address: { type: String, required: true }
    },
    preferredDeliveryWindow: {
      earliest: { type: Date, required: true },
      latest: { type: Date, required: true }
    },
    status: {
      type: String,
      enum: [
        'pending',
        'matched',
        'pickup_otp_sent',
        'picked_up',
        'in_transit',
        'delivery_otp_sent',
        'delivered',
        'cancelled',
        'expired'
      ],
      default: 'pending'
    },
    quotedPrice: { type: Number },
    platformFee: { type: Number },
    totalCharge: { type: Number },
    match: { type: Schema.Types.ObjectId, ref: 'Match' },
    paymentOrderId: { type: String },
    paymentStatus: {
      type: String,
      enum: ['unpaid', 'paid', 'refunded', 'partial_refund'],
      default: 'unpaid'
    },
    expiresAt: { type: Date }
  },
  { timestamps: true }
);

DeliveryRequestSchema.index({ sender: 1, status: 1 });
DeliveryRequestSchema.index({ status: 1, createdAt: -1 });
DeliveryRequestSchema.index({ sender: 1, createdAt: -1 });
DeliveryRequestSchema.index({ 'origin.city': 1, 'destination.city': 1, status: 1 });
DeliveryRequestSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const DeliveryRequest = model<IDeliveryRequest, DeliveryRequestModel>('DeliveryRequest', DeliveryRequestSchema);

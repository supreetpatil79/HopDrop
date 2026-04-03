import { HydratedDocument, Model, Schema, Types, model } from 'mongoose';

export interface ILocation {
  city: string;
  state?: string;
  coordinates?: {
    type: 'Point';
    coordinates: [number, number];
  };
  placeId?: string;
  fullAddress?: string;
}

export interface ITrip {
  carrier: Types.ObjectId;
  origin: ILocation;
  destination: ILocation;
  departureTime: Date;
  estimatedArrivalTime?: Date;
  modeOfTransport: 'bus' | 'train' | 'car' | 'bike' | 'flight' | 'other';
  transportDetails?: {
    name?: string;
    pnr?: string;
    seatNumber?: string;
  };
  availableCapacity: {
    weightKg: number;
    dimensionsCm?: {
      length?: number;
      width?: number;
      height?: number;
    };
    allowedCategories: Array<'documents' | 'clothing' | 'electronics' | 'food' | 'fragile' | 'medicine' | 'other'>;
  };
  pricePerKg: number;
  status: 'active' | 'full' | 'in_transit' | 'completed' | 'cancelled';
  safetyDepositPaid: boolean;
  safetyDepositAmount?: number;
  safetyDepositTransactionId?: string;
  pickupInstructions?: string;
  dropoffInstructions?: string;
  matches: Types.ObjectId[];
  rapido?: {
    bookingId?: string;
    status?: string;
    driverDetails?: Record<string, unknown>;
  };
  createdAt: Date;
  updatedAt: Date;
}

export type TripDocument = HydratedDocument<ITrip>;
export type TripModel = Model<ITrip>;

const locationSchema = new Schema<ILocation>(
  {
    city: { type: String, required: true },
    state: { type: String },
    coordinates: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point'
      },
      coordinates: { type: [Number] }
    },
    placeId: { type: String },
    fullAddress: { type: String }
  },
  { _id: false }
);

const TripSchema = new Schema<ITrip>(
  {
    carrier: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    origin: locationSchema,
    destination: {
      city: String,
      state: String,
      coordinates: {
        type: {
          type: String,
          enum: ['Point']
        },
        coordinates: [Number]
      },
      placeId: String,
      fullAddress: String
    },
    departureTime: { type: Date, required: true },
    estimatedArrivalTime: { type: Date },
    modeOfTransport: {
      type: String,
      enum: ['bus', 'train', 'car', 'bike', 'flight', 'other'],
      required: true
    },
    transportDetails: {
      name: String,
      pnr: String,
      seatNumber: String
    },
    availableCapacity: {
      weightKg: { type: Number, required: true, max: 30 },
      dimensionsCm: {
        length: Number,
        width: Number,
        height: Number
      },
      allowedCategories: [
        {
          type: String,
          enum: ['documents', 'clothing', 'electronics', 'food', 'fragile', 'medicine', 'other']
        }
      ]
    },
    pricePerKg: { type: Number, required: true },
    status: {
      type: String,
      enum: ['active', 'full', 'in_transit', 'completed', 'cancelled'],
      default: 'active'
    },
    safetyDepositPaid: { type: Boolean, default: false },
    safetyDepositAmount: { type: Number },
    safetyDepositTransactionId: { type: String },
    pickupInstructions: { type: String },
    dropoffInstructions: { type: String },
    matches: [{ type: Schema.Types.ObjectId, ref: 'Match' }],
    rapido: {
      bookingId: String,
      status: String,
      driverDetails: Schema.Types.Mixed
    }
  },
  { timestamps: true }
);

TripSchema.index({ 'origin.city': 1, 'destination.city': 1, departureTime: 1, status: 1 });
TripSchema.index({ carrier: 1, status: 1 });
TripSchema.index({ 'origin.coordinates': '2dsphere' });
TripSchema.index({ 'destination.coordinates': '2dsphere' });

export const Trip = model<ITrip, TripModel>('Trip', TripSchema);

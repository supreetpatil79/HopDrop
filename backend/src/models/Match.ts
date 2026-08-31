import { HydratedDocument, Model, Schema, Types, model } from 'mongoose';

type MatchStatus =
  | 'proposed'
  | 'carrier_accepted'
  | 'sender_confirmed'
  | 'active'
  | 'pickup_pending'
  | 'picked_up'
  | 'in_transit'
  | 'delivery_pending'
  | 'delivered'
  | 'cancelled'
  | 'disputed';

export interface IMatch {
  trip: Types.ObjectId;
  deliveryRequest: Types.ObjectId;
  carrier: Types.ObjectId;
  sender: Types.ObjectId;
  status: MatchStatus;
  otp: {
    pickup: { code?: string; generatedAt?: Date; verifiedAt?: Date };
    delivery: { code?: string; generatedAt?: Date; verifiedAt?: Date };
  };
  timeline: Array<{
    event:
      | 'match_proposed'
      | 'carrier_accepted'
      | 'sender_confirmed'
      | 'payment_done'
      | 'pickup_otp_generated'
      | 'pickup_verified'
      | 'delivery_otp_generated'
      | 'delivery_verified'
      | 'completed'
      | 'cancelled'
      | 'disputed'
      | 'rapido_booked';
    timestamp?: Date;
    actor?: Types.ObjectId;
    metadata?: Record<string, unknown>;
  }>;
  agreedPrice: number;
  payoutToCarrier?: number;
  escrowTransactionId?: string;
  rapido: {
    requested: boolean;
    bookingId?: string;
    status?: string;
  };
  rating: {
    senderRatedCarrier?: { score?: number; comment?: string; at?: Date };
    carrierRatedSender?: { score?: number; comment?: string; at?: Date };
  };
  createdAt: Date;
  updatedAt: Date;
}

export type MatchDocument = HydratedDocument<IMatch>;
export type MatchModel = Model<IMatch>;

const MatchSchema = new Schema<IMatch>(
  {
    trip: { type: Schema.Types.ObjectId, ref: 'Trip', required: true },
    deliveryRequest: { type: Schema.Types.ObjectId, ref: 'DeliveryRequest', required: true },
    carrier: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    sender: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    status: {
      type: String,
      enum: [
        'proposed',
        'carrier_accepted',
        'sender_confirmed',
        'active',
        'pickup_pending',
        'picked_up',
        'in_transit',
        'delivery_pending',
        'delivered',
        'cancelled',
        'disputed'
      ],
      default: 'proposed'
    },
    otp: {
      pickup: {
        code: String,
        generatedAt: Date,
        verifiedAt: Date
      },
      delivery: {
        code: String,
        generatedAt: Date,
        verifiedAt: Date
      }
    },
    timeline: [
      {
        event: {
          type: String,
          enum: [
            'match_proposed',
            'carrier_accepted',
            'sender_confirmed',
            'payment_done',
            'pickup_otp_generated',
            'pickup_verified',
            'delivery_otp_generated',
            'delivery_verified',
            'completed',
            'cancelled',
            'disputed',
            'rapido_booked'
          ]
        },
        timestamp: { type: Date, default: Date.now },
        actor: { type: Schema.Types.ObjectId, ref: 'User' },
        metadata: Schema.Types.Mixed
      }
    ],
    agreedPrice: { type: Number, required: true },
    payoutToCarrier: { type: Number },
    escrowTransactionId: { type: String },
    rapido: {
      requested: { type: Boolean, default: false },
      bookingId: String,
      status: String
    },
    rating: {
      senderRatedCarrier: {
        score: Number,
        comment: String,
        at: Date
      },
      carrierRatedSender: {
        score: Number,
        comment: String,
        at: Date
      }
    }
  },
  { timestamps: true }
);

MatchSchema.index({ trip: 1, deliveryRequest: 1 }, { unique: true });
MatchSchema.index({ deliveryRequest: 1, carrier: 1 });
MatchSchema.index({ carrier: 1, status: 1 });
MatchSchema.index({ sender: 1, status: 1 });
MatchSchema.index({ status: 1, createdAt: -1 });

export const Match = model<IMatch, MatchModel>('Match', MatchSchema);

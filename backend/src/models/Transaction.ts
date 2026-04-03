import { HydratedDocument, Model, Schema, Types, model } from 'mongoose';

export interface ITransaction {
  user: Types.ObjectId;
  match?: Types.ObjectId;
  type:
    | 'delivery_payment'
    | 'safety_deposit'
    | 'carrier_payout'
    | 'refund'
    | 'platform_fee'
    | 'escrow_hold'
    | 'escrow_release';
  amount: number;
  currency: string;
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  razorpaySignature?: string;
  status: 'initiated' | 'pending' | 'completed' | 'failed' | 'refunded';
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

export type TransactionDocument = HydratedDocument<ITransaction>;
export type TransactionModel = Model<ITransaction>;

const TransactionSchema = new Schema<ITransaction>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    match: { type: Schema.Types.ObjectId, ref: 'Match' },
    type: {
      type: String,
      enum: ['delivery_payment', 'safety_deposit', 'carrier_payout', 'refund', 'platform_fee', 'escrow_hold', 'escrow_release'],
      required: true
    },
    amount: { type: Number, required: true },
    currency: { type: String, default: 'INR' },
    razorpayOrderId: String,
    razorpayPaymentId: String,
    razorpaySignature: String,
    status: {
      type: String,
      enum: ['initiated', 'pending', 'completed', 'failed', 'refunded'],
      default: 'initiated'
    },
    description: String
  },
  { timestamps: true }
);

export const Transaction = model<ITransaction, TransactionModel>('Transaction', TransactionSchema);

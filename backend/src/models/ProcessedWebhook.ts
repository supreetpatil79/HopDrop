import mongoose, { Schema, Document } from 'mongoose';

// ─── ProcessedWebhook ─────────────────────────────────────────────────────
// Stores every processed Razorpay event ID with a 72-hour TTL.
// The unique index on eventId guarantees exactly-once processing even
// under concurrent retries from Razorpay's delivery infrastructure.
// ─────────────────────────────────────────────────────────────────────────

export interface IProcessedWebhook extends Document {
  eventId: string;         // Razorpay payment_id or event unique identifier
  event: string;           // e.g. "payment.captured"
  orderId: string;         // razorpay order_id
  processedAt: Date;
}

const ProcessedWebhookSchema = new Schema<IProcessedWebhook>(
  {
    eventId:     { type: String, required: true, unique: true },
    event:       { type: String, required: true },
    orderId:     { type: String, required: true },
    processedAt: { type: Date, default: Date.now }
  },
  { collection: 'processed_webhooks' }
);

// TTL index: auto-delete records after 72 hours (keeps the collection lean)
ProcessedWebhookSchema.index({ processedAt: 1 }, { expireAfterSeconds: 72 * 60 * 60 });

export const ProcessedWebhook = mongoose.model<IProcessedWebhook>('ProcessedWebhook', ProcessedWebhookSchema);

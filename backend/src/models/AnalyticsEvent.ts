import { Schema, model, Document } from 'mongoose';

export interface IAnalyticsEvent extends Document {
  userId?: string;
  sessionId: string;
  page: string;
  event: 'dwell' | 'click' | 'pageview';
  durationMs?: number;
  meta?: Record<string, unknown>;
  createdAt: Date;
}

const AnalyticsEventSchema = new Schema<IAnalyticsEvent>(
  {
    userId: { type: String, index: true },
    sessionId: { type: String, required: true, index: true },
    page: { type: String, required: true, index: true },
    event: { type: String, enum: ['dwell', 'click', 'pageview'], required: true },
    durationMs: { type: Number },
    meta: { type: Schema.Types.Mixed }
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

// TTL: auto-purge events older than 90 days
AnalyticsEventSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 90 });

export const AnalyticsEvent = model<IAnalyticsEvent>('AnalyticsEvent', AnalyticsEventSchema);

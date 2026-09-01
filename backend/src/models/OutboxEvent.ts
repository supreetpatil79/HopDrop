import { HydratedDocument, Model, Schema, model } from 'mongoose';

export type OutboxEventStatus = 'pending' | 'processing' | 'published' | 'failed';

export interface IOutboxEvent {
  topic: string;
  eventType: string;
  aggregateType: string;
  aggregateId: string;
  partitionKey?: string;
  payload: Record<string, unknown>;
  headers?: Record<string, string>;
  status: OutboxEventStatus;
  attempts: number;
  availableAt: Date;
  publishedAt?: Date;
  lastError?: string;
  // TTL anchor: set when the event reaches a terminal state (published/failed)
  // so MongoDB's TTL monitor can prune it after OUTBOX_RETENTION_DAYS.
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type OutboxEventDocument = HydratedDocument<IOutboxEvent>;
export type OutboxEventModel = Model<IOutboxEvent>;

// Retain terminal outbox events for 7 days so they are available for
// debugging and audit, then MongoDB's TTL monitor removes them automatically.
const OUTBOX_RETENTION_SECONDS = 7 * 24 * 60 * 60; // 7 days

const OutboxEventSchema = new Schema<IOutboxEvent>(
  {
    topic: { type: String, required: true },
    eventType: { type: String, required: true },
    aggregateType: { type: String, required: true },
    aggregateId: { type: String, required: true },
    partitionKey: { type: String },
    payload: { type: Schema.Types.Mixed, required: true },
    headers: { type: Schema.Types.Mixed, default: {} },
    status: {
      type: String,
      enum: ['pending', 'processing', 'published', 'failed'],
      default: 'pending'
    },
    attempts: { type: Number, default: 0 },
    availableAt: { type: Date, default: Date.now },
    publishedAt: { type: Date },
    lastError: { type: String },
    // Populated by the relay when an event reaches published or failed state.
    // MongoDB's TTL monitor deletes the document OUTBOX_RETENTION_SECONDS after
    // this date. Pending/processing events have no expiresAt and are never pruned.
    expiresAt: { type: Date, index: false }
  },
  { timestamps: true }
);

// ── Query indexes ──────────────────────────────────────────────────────────────
OutboxEventSchema.index({ status: 1, availableAt: 1, createdAt: 1 });
OutboxEventSchema.index({ aggregateType: 1, aggregateId: 1, createdAt: -1 });

// ── TTL index: auto-delete terminal events 7 days after they are marked done ──
// expireAfterSeconds: 0 means "delete at the exact date stored in expiresAt".
OutboxEventSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0, sparse: true });

export const OutboxEvent = model<IOutboxEvent, OutboxEventModel>('OutboxEvent', OutboxEventSchema);
export { OUTBOX_RETENTION_SECONDS };

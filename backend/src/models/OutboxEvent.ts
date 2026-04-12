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
  createdAt: Date;
  updatedAt: Date;
}

export type OutboxEventDocument = HydratedDocument<IOutboxEvent>;
export type OutboxEventModel = Model<IOutboxEvent>;

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
    lastError: { type: String }
  },
  { timestamps: true }
);

OutboxEventSchema.index({ status: 1, availableAt: 1, createdAt: 1 });
OutboxEventSchema.index({ aggregateType: 1, aggregateId: 1, createdAt: -1 });

export const OutboxEvent = model<IOutboxEvent, OutboxEventModel>('OutboxEvent', OutboxEventSchema);

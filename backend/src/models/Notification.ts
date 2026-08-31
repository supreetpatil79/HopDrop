import { Schema, model, Types } from 'mongoose';

interface INotification {
  user: Types.ObjectId;
  title: string;
  body: string;
  type: string;
  read: boolean;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true },
    body: { type: String, required: true },
    type: { type: String, required: true },
    read: { type: Boolean, default: false },
    metadata: Schema.Types.Mixed
  },
  { timestamps: true }
);

NotificationSchema.index({ user: 1, createdAt: -1 });
NotificationSchema.index({ user: 1, read: 1, createdAt: -1 });

export const Notification = model<INotification>('Notification', NotificationSchema);

import { Types } from 'mongoose';
import { io } from '../config/socket';
import { Notification } from '../models/Notification';

export async function notifyUser(params: {
  userId: string | Types.ObjectId;
  title: string;
  body: string;
  type: string;
  metadata?: Record<string, unknown>;
}) {
  const notification = await Notification.create({
    user: params.userId,
    title: params.title,
    body: params.body,
    type: params.type,
    metadata: params.metadata
  });

  io?.to(`user:${params.userId.toString()}`).emit('notification:new', notification);
  return notification;
}

export async function emitToUser(userId: string | Types.ObjectId, event: string, payload: Record<string, unknown>) {
  io?.to(`user:${userId.toString()}`).emit(event, payload);
}

export async function emitToMatch(matchId: string, event: string, payload: Record<string, unknown>) {
  io?.to(`match:${matchId}`).emit(event, payload);
}

export async function emitToTrip(tripId: string, event: string, payload: Record<string, unknown>) {
  io?.to(`trip:${tripId}`).emit(event, payload);
}

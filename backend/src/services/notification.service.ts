import { Types } from 'mongoose';
import { env } from '../config/env';
import { DOMAIN_TOPICS } from '../events/domainEvents';
import { Notification } from '../models/Notification';
import { isKafkaConfigured } from './kafka.service';
import { appendOutboxEvents } from './outbox.service';
import { publishRealtimeEvent } from './realtime.service';

function shouldDispatchAsync() {
  return env.OUTBOX_RELAY_ENABLED && isKafkaConfigured();
}

export async function notifyUser(params: {
  userId: string | Types.ObjectId;
  title: string;
  body: string;
  type: string;
  metadata?: Record<string, unknown>;
}) {
  if (shouldDispatchAsync()) {
    await appendOutboxEvents([
      {
        topic: DOMAIN_TOPICS.notification,
        eventType: 'UserNotificationDispatchRequested',
        aggregateType: 'user',
        aggregateId: params.userId.toString(),
        partitionKey: params.userId.toString(),
        payload: {
          userId: params.userId.toString(),
          title: params.title,
          body: params.body,
          type: params.type,
          metadata: params.metadata || {}
        }
      }
    ]);
    return null;
  }

  const notification = await Notification.create({
    user: params.userId,
    title: params.title,
    body: params.body,
    type: params.type,
    metadata: params.metadata
  });

  await publishRealtimeEvent({
    target: { type: 'user', id: params.userId.toString() },
    event: 'notification:new',
    payload: notification.toJSON()
  });
  return notification;
}

export async function emitToUser(userId: string | Types.ObjectId, event: string, payload: Record<string, unknown>) {
  if (shouldDispatchAsync()) {
    await appendOutboxEvents([
      {
        topic: DOMAIN_TOPICS.realtime,
        eventType: 'RealtimeDispatchRequested',
        aggregateType: 'user',
        aggregateId: userId.toString(),
        partitionKey: userId.toString(),
        payload: {
          target: { type: 'user', id: userId.toString() },
          event,
          payload
        }
      }
    ]);
    return;
  }

  await publishRealtimeEvent({
    target: { type: 'user', id: userId.toString() },
    event,
    payload
  });
}

export async function emitToMatch(matchId: string, event: string, payload: Record<string, unknown>) {
  if (shouldDispatchAsync()) {
    await appendOutboxEvents([
      {
        topic: DOMAIN_TOPICS.realtime,
        eventType: 'RealtimeDispatchRequested',
        aggregateType: 'match',
        aggregateId: matchId,
        partitionKey: matchId,
        payload: {
          target: { type: 'match', id: matchId },
          event,
          payload
        }
      }
    ]);
    return;
  }

  await publishRealtimeEvent({
    target: { type: 'match', id: matchId },
    event,
    payload
  });
}

export async function emitToTrip(tripId: string, event: string, payload: Record<string, unknown>) {
  if (shouldDispatchAsync()) {
    await appendOutboxEvents([
      {
        topic: DOMAIN_TOPICS.realtime,
        eventType: 'RealtimeDispatchRequested',
        aggregateType: 'trip',
        aggregateId: tripId,
        partitionKey: tripId,
        payload: {
          target: { type: 'trip', id: tripId },
          event,
          payload
        }
      }
    ]);
    return;
  }

  await publishRealtimeEvent({
    target: { type: 'trip', id: tripId },
    event,
    payload
  });
}

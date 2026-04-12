import type { ClientSession } from 'mongoose';
import { OutboxEvent, OutboxEventDocument } from '../models/OutboxEvent';
import { outboxEventsAppendedTotal } from '../observability/metrics';

export interface AppendOutboxEventInput {
  topic: string;
  eventType: string;
  aggregateType: string;
  aggregateId: string;
  partitionKey?: string;
  payload: Record<string, unknown>;
  headers?: Record<string, string>;
  availableAt?: Date;
}

export async function appendOutboxEvents(events: AppendOutboxEventInput[], session?: ClientSession) {
  if (!events.length) {
    return [];
  }

  events.forEach((event) => {
    outboxEventsAppendedTotal.inc({
      topic: event.topic,
      event_type: event.eventType
    });
  });

  return OutboxEvent.insertMany(
    events.map((event) => ({
      ...event,
      status: 'pending',
      attempts: 0,
      availableAt: event.availableAt || new Date(),
      headers: event.headers || {}
    })),
    { session, ordered: true }
  );
}

export async function claimOutboxBatch(limit: number) {
  const claimed: OutboxEventDocument[] = [];
  const now = new Date();

  for (let index = 0; index < limit; index += 1) {
    const event = await OutboxEvent.findOneAndUpdate(
      {
        status: 'pending',
        availableAt: { $lte: now }
      },
      {
        $set: { status: 'processing' },
        $inc: { attempts: 1 }
      },
      {
        sort: { createdAt: 1 },
        new: true
      }
    );

    if (!event) {
      break;
    }

    claimed.push(event);
  }

  return claimed;
}

export async function markOutboxEventPublished(eventId: string) {
  await OutboxEvent.findByIdAndUpdate(eventId, {
    $set: {
      status: 'published',
      publishedAt: new Date(),
      lastError: null
    }
  });
}

export async function releaseOutboxEvent(eventId: string, errorMessage: string, maxAttempts: number) {
  const event = await OutboxEvent.findById(eventId);

  if (!event) {
    return;
  }

  const attempts = event.attempts || 0;
  const exhausted = attempts >= maxAttempts;
  const retryDelayMs = Math.min(30000, 1000 * 2 ** Math.max(0, attempts - 1));

  await OutboxEvent.findByIdAndUpdate(eventId, {
    $set: {
      status: exhausted ? 'failed' : 'pending',
      lastError: errorMessage,
      availableAt: exhausted ? event.availableAt : new Date(Date.now() + retryDelayMs)
    }
  });
}

export async function requeueProcessingOutboxEvents() {
  await OutboxEvent.updateMany(
    { status: 'processing' },
    {
      $set: {
        status: 'pending',
        availableAt: new Date()
      }
    }
  );
}

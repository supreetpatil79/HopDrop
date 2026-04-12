import { env } from '../config/env';
import { logger } from '../observability/logger';
import { outboxEventsFailedTotal, outboxEventsPublishedTotal } from '../observability/metrics';
import { disconnectKafkaProducer, isKafkaConfigured, publishKafkaMessage } from './kafka.service';
import {
  claimOutboxBatch,
  markOutboxEventPublished,
  releaseOutboxEvent,
  requeueProcessingOutboxEvents
} from './outbox.service';

let relayTimer: NodeJS.Timeout | null = null;
let isRunning = false;

function shouldRunOutboxRelay() {
  return env.OUTBOX_RELAY_ENABLED && isKafkaConfigured();
}

async function flushOutboxBatch() {
  if (isRunning) {
    return;
  }

  isRunning = true;

  try {
    const events = await claimOutboxBatch(env.OUTBOX_BATCH_SIZE);

    for (const event of events) {
      try {
        await publishKafkaMessage({
          topic: event.topic,
          key: event.partitionKey || event.aggregateId,
          headers: event.headers,
          value: {
            event_id: event._id.toString(),
            event_type: event.eventType,
            aggregate_type: event.aggregateType,
            aggregate_id: event.aggregateId,
            schema_version: 1,
            occurred_at: event.createdAt.toISOString(),
            payload: event.payload
          }
        });

        await markOutboxEventPublished(event._id.toString());
        outboxEventsPublishedTotal.inc({
          topic: event.topic,
          event_type: event.eventType
        });
        logger.info(
          {
            outbox_event_id: event._id.toString(),
            topic: event.topic,
            event_type: event.eventType,
            aggregate_type: event.aggregateType,
            aggregate_id: event.aggregateId
          },
          'outbox_event_published'
        );
      } catch (error: any) {
        outboxEventsFailedTotal.inc({
          topic: event.topic,
          event_type: event.eventType
        });
        await releaseOutboxEvent(
          event._id.toString(),
          String(error?.message || error || 'Outbox relay failed'),
          env.OUTBOX_MAX_ATTEMPTS
        );
        logger.error(
          {
            outbox_event_id: event._id.toString(),
            topic: event.topic,
            event_type: event.eventType,
            aggregate_type: event.aggregateType,
            aggregate_id: event.aggregateId,
            error: String(error?.message || error || 'Outbox relay failed')
          },
          'outbox_event_publish_failed'
        );
      }
    }
  } finally {
    isRunning = false;
  }
}

export async function startOutboxRelay() {
  if (!shouldRunOutboxRelay()) {
    return;
  }

  await requeueProcessingOutboxEvents();
  await flushOutboxBatch();

  relayTimer = setInterval(() => {
    void flushOutboxBatch();
  }, env.OUTBOX_POLL_INTERVAL_MS);
}

export async function stopOutboxRelay() {
  if (relayTimer) {
    clearInterval(relayTimer);
    relayTimer = null;
  }

  await disconnectKafkaProducer();
}

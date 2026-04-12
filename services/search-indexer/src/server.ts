import http from 'http';
import axios from 'axios';
import { Consumer, Kafka, logLevel } from 'kafkajs';
import { env } from './config';
import { logger } from './logger';
import { consumerConnected, messagesProcessedTotal, metricsPayload, metricsRegistry } from './metrics';

type DomainEventEnvelope = {
  event_id: string;
  event_type: string;
  aggregate_type: string;
  aggregate_id: string;
  schema_version: number;
  occurred_at: string;
  payload: Record<string, any>;
};

let consumer: Consumer | null = null;
let ready = false;

function topicName(topic: string): string {
  return env.KAFKA_TOPIC_PREFIX ? `${env.KAFKA_TOPIC_PREFIX}.${topic}` : topic;
}

async function postToRoutingSearch(path: string, payload: Record<string, unknown>) {
  return axios.post(`${env.ROUTING_SEARCH_URL.replace(/\/$/, '')}${path}`, payload, {
    timeout: 8000
  });
}

async function handleTripLifecycle(envelope: DomainEventEnvelope) {
  const payload = envelope.payload || {};
  await postToRoutingSearch('/internal/v1/index/trip-upsert', {
    trip_id: payload.tripId || envelope.aggregate_id,
    carrier_id: payload.carrierId,
    origin: payload.origin,
    destination: payload.destination,
    departure_time: payload.departureTime,
    price_per_kg: payload.pricePerKg,
    available_capacity: payload.availableCapacity,
    status: payload.status,
    safety_deposit_paid: payload.safetyDepositPaid,
    event_type: envelope.event_type,
    occurred_at: envelope.occurred_at
  });
}

async function handleDeliveryLifecycle(envelope: DomainEventEnvelope) {
  const payload = envelope.payload || {};
  const requestId = payload.requestId || envelope.aggregate_id;
  const writes: Array<Promise<unknown>> = [];

  writes.push(
    postToRoutingSearch('/internal/v1/index/delivery-request-upsert', {
      delivery_request_id: requestId,
      sender_id: payload.senderId || payload.userId,
      origin: payload.origin,
      destination: payload.destination,
      pickup_window: payload.pickupWindow || payload.preferredDeliveryWindow,
      package: payload.package,
      status: payload.status,
      payment_status: payload.paymentStatus,
      total_charge: payload.totalCharge,
      event_type: envelope.event_type,
      occurred_at: envelope.occurred_at
    })
  );

  if (payload.origin?.city) {
    writes.push(
      postToRoutingSearch('/internal/v1/index/location-upsert', {
        location_id: `${requestId}:origin`,
        entity_id: requestId,
        entity_kind: 'delivery_request',
        role: 'origin',
        city: payload.origin.city,
        place_id: payload.origin.placeId || payload.origin.place_id || null,
        latitude: payload.origin.latitude || null,
        longitude: payload.origin.longitude || null,
        event_type: envelope.event_type,
        occurred_at: envelope.occurred_at
      })
    );
  }

  if (payload.destination?.city) {
    writes.push(
      postToRoutingSearch('/internal/v1/index/location-upsert', {
        location_id: `${requestId}:destination`,
        entity_id: requestId,
        entity_kind: 'delivery_request',
        role: 'destination',
        city: payload.destination.city,
        place_id: payload.destination.placeId || payload.destination.place_id || null,
        latitude: payload.destination.latitude || null,
        longitude: payload.destination.longitude || null,
        event_type: envelope.event_type,
        occurred_at: envelope.occurred_at
      })
    );
  }

  await Promise.all(writes);
}

async function handlePaymentLifecycle(envelope: DomainEventEnvelope) {
  const payload = envelope.payload || {};
  if (envelope.event_type !== 'DeliveryPaid') {
    return;
  }

  await postToRoutingSearch('/internal/v1/index/delivery-request-upsert', {
    delivery_request_id: payload.requestId || envelope.aggregate_id,
    sender_id: payload.userId,
    payment_status: payload.paymentStatus,
    total_charge: payload.totalCharge,
    event_type: envelope.event_type,
    occurred_at: envelope.occurred_at
  });
}

async function handleMessage(topic: string, envelope: DomainEventEnvelope) {
  if (topic === topicName('trip.lifecycle')) {
    await handleTripLifecycle(envelope);
    return;
  }

  if (topic === topicName('delivery.lifecycle')) {
    await handleDeliveryLifecycle(envelope);
    return;
  }

  if (topic === topicName('payment.lifecycle')) {
    await handlePaymentLifecycle(envelope);
  }
}

const requestHandler: http.RequestListener = async (req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ service: 'search-indexer', status: 'ok' }));
    return;
  }

  if (req.url === '/ready') {
    res.writeHead(ready ? 200 : 503, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ service: 'search-indexer', status: ready ? 'ready' : 'degraded' }));
    return;
  }

  if (req.url === '/metrics') {
    res.writeHead(200, { 'Content-Type': metricsRegistry.contentType });
    res.end(await metricsPayload());
    return;
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ message: 'not_found' }));
};

const server = http.createServer(requestHandler);

async function bootstrap() {
  const kafka = new Kafka({
    clientId: env.KAFKA_CLIENT_ID,
    brokers: env.KAFKA_BROKERS.split(',').map((broker) => broker.trim()),
    logLevel: logLevel.NOTHING
  });

  consumer = kafka.consumer({ groupId: `${env.KAFKA_CLIENT_ID}-group` });
  await consumer.connect();
  consumerConnected.set(1);

  await consumer.subscribe({ topic: topicName('trip.lifecycle'), fromBeginning: false });
  await consumer.subscribe({ topic: topicName('delivery.lifecycle'), fromBeginning: false });
  await consumer.subscribe({ topic: topicName('payment.lifecycle'), fromBeginning: false });

  await consumer.run({
    eachMessage: async ({ topic, message }) => {
      const raw = message.value?.toString();
      if (!raw) {
        return;
      }

      let envelope: DomainEventEnvelope;
      try {
        envelope = JSON.parse(raw) as DomainEventEnvelope;
      } catch (error) {
        messagesProcessedTotal.inc({
          topic,
          event_type: 'unknown',
          outcome: 'parse_failed'
        });
        logger.warn(
          {
            topic,
            value: raw,
            error: String((error as Error)?.message || error || 'Failed to parse Kafka message')
          },
          'search_indexer_parse_failed'
        );
        return;
      }

      try {
        await handleMessage(topic, envelope);
        messagesProcessedTotal.inc({
          topic,
          event_type: envelope.event_type,
          outcome: 'indexed'
        });
        logger.info(
          {
            topic,
            event_type: envelope.event_type,
            aggregate_type: envelope.aggregate_type,
            aggregate_id: envelope.aggregate_id
          },
          'search_indexer_message_processed'
        );
      } catch (error) {
        messagesProcessedTotal.inc({
          topic,
          event_type: envelope.event_type,
          outcome: 'failed'
        });
        logger.error(
          {
            topic,
            event_type: envelope.event_type,
            aggregate_type: envelope.aggregate_type,
            aggregate_id: envelope.aggregate_id,
            error: String((error as Error)?.message || error || 'Search indexing failed')
          },
          'search_indexer_message_failed'
        );
        throw error;
      }
    }
  });

  ready = true;

  server.listen(env.SEARCH_INDEXER_PORT, () => {
    logger.info(
        {
          port: env.SEARCH_INDEXER_PORT,
        topics: [topicName('trip.lifecycle'), topicName('delivery.lifecycle'), topicName('payment.lifecycle')]
      },
      'search_indexer_started'
    );
  });
}

async function shutdown() {
  ready = false;
  consumerConnected.set(0);
  await Promise.allSettled([
    consumer?.disconnect(),
    new Promise<void>((resolve, reject) => {
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve();
      });
    })
  ]);
}

bootstrap().catch((error) => {
  logger.error(
    {
      error: String((error as Error)?.message || error || 'Failed to start search indexer')
    },
    'search_indexer_boot_failed'
  );
  process.exit(1);
});

process.on('SIGTERM', () => {
  void shutdown().finally(() => process.exit(0));
});

process.on('SIGINT', () => {
  void shutdown().finally(() => process.exit(0));
});

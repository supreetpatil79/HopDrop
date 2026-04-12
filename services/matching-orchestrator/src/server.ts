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

async function triggerCoreApi(path: string) {
  await axios.post(
    `${env.CORE_API_URL.replace(/\/$/, '')}${path}`,
    {},
    {
      timeout: 12000,
      headers: {
        'x-internal-service-token': env.INTERNAL_API_TOKEN
      }
    }
  );
}

async function handleMessage(topic: string, envelope: DomainEventEnvelope): Promise<'delivery' | 'trip' | 'skipped'> {
  const payload = envelope.payload || {};

  if (topic === topicName('delivery.lifecycle')) {
    const requestId = payload.requestId || envelope.aggregate_id;
    if (!requestId || payload.status === 'cancelled') {
      return 'skipped';
    }

    if (['DeliveryRequested', 'DeliveryUpdated'].includes(envelope.event_type)) {
      await triggerCoreApi(`/internal/v1/matching/delivery-requests/${requestId}`);
      return 'delivery';
    }

    return 'skipped';
  }

  if (topic === topicName('payment.lifecycle')) {
    const requestId = payload.requestId || envelope.aggregate_id;
    if (envelope.event_type === 'DeliveryPaid' && requestId) {
      await triggerCoreApi(`/internal/v1/matching/delivery-requests/${requestId}`);
      return 'delivery';
    }

    return 'skipped';
  }

  if (topic === topicName('trip.lifecycle')) {
    const tripId = payload.tripId || envelope.aggregate_id;
    const safetyDepositPaid =
      payload.safetyDepositPaid === true ||
      payload.safety_deposit_paid === true ||
      payload?.updates?.safetyDepositPaid === true ||
      payload?.updates?.safety_deposit_paid === true;

    if (!tripId || payload.status !== 'active' || !safetyDepositPaid) {
      return 'skipped';
    }

    if (['TripPosted', 'TripUpdated'].includes(envelope.event_type)) {
      await triggerCoreApi(`/internal/v1/matching/trips/${tripId}`);
      return 'trip';
    }
  }

  return 'skipped';
}

const requestHandler: http.RequestListener = async (req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ service: 'matching-orchestrator', status: 'ok' }));
    return;
  }

  if (req.url === '/ready') {
    res.writeHead(ready ? 200 : 503, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ service: 'matching-orchestrator', status: ready ? 'ready' : 'degraded' }));
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

  await consumer.subscribe({ topic: topicName('delivery.lifecycle'), fromBeginning: false });
  await consumer.subscribe({ topic: topicName('trip.lifecycle'), fromBeginning: false });
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
          action: 'parse',
          outcome: 'failed'
        });
        logger.warn(
          {
            topic,
            value: raw,
            error: String((error as Error)?.message || error || 'Failed to parse Kafka message')
          },
          'matching_orchestrator_parse_failed'
        );
        return;
      }

      try {
        const action = await handleMessage(topic, envelope);
        messagesProcessedTotal.inc({
          topic,
          event_type: envelope.event_type,
          action,
          outcome: action === 'skipped' ? 'skipped' : 'triggered'
        });
        logger.info(
          {
            topic,
            event_type: envelope.event_type,
            aggregate_type: envelope.aggregate_type,
            aggregate_id: envelope.aggregate_id,
            action
          },
          'matching_orchestrator_message_processed'
        );
      } catch (error) {
        messagesProcessedTotal.inc({
          topic,
          event_type: envelope.event_type,
          action: 'dispatch',
          outcome: 'failed'
        });
        logger.error(
          {
            topic,
            event_type: envelope.event_type,
            aggregate_type: envelope.aggregate_type,
            aggregate_id: envelope.aggregate_id,
            error: String((error as Error)?.message || error || 'Matching orchestration failed')
          },
          'matching_orchestrator_message_failed'
        );
        throw error;
      }
    }
  });

  ready = true;

  server.listen(env.MATCHING_ORCHESTRATOR_PORT, () => {
    logger.info(
      {
        port: env.MATCHING_ORCHESTRATOR_PORT,
        topics: [topicName('delivery.lifecycle'), topicName('trip.lifecycle'), topicName('payment.lifecycle')]
      },
      'matching_orchestrator_started'
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
      error: String((error as Error)?.message || error || 'Failed to bootstrap matching orchestrator')
    },
    'matching_orchestrator_bootstrap_failed'
  );
  process.exit(1);
});

process.on('SIGTERM', () => {
  void shutdown();
});

process.on('SIGINT', () => {
  void shutdown();
});

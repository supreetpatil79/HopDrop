import http from 'http';
import { Consumer, Kafka, logLevel } from 'kafkajs';
import { env } from './config';
import { logger } from './logger';
import { consumerConnected, conversionStepsTotal, lifecycleEventsTotal, metricsPayload, metricsRegistry } from './metrics';

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

function recordDerivedConversion(eventType: string, payload: Record<string, any>) {
  if (eventType === 'DeliveryRequested') {
    conversionStepsTotal.inc({ flow: 'sender_activation', step: 'delivery_requested' });
  }

  if (eventType === 'DeliveryPaid') {
    conversionStepsTotal.inc({ flow: 'sender_activation', step: 'payment_completed' });
  }

  if (eventType === 'MatchProposed') {
    conversionStepsTotal.inc({ flow: 'marketplace', step: 'match_proposed' });
  }

  if (eventType === 'CarrierAccepted') {
    conversionStepsTotal.inc({ flow: 'marketplace', step: 'carrier_accepted' });
  }

  if (eventType === 'SenderConfirmed') {
    conversionStepsTotal.inc({ flow: 'marketplace', step: 'sender_confirmed' });
  }

  if (eventType === 'DeliveryCompleted' || eventType === 'PayoutCompleted') {
    conversionStepsTotal.inc({ flow: 'sender_activation', step: 'delivery_completed' });
  }

  if (eventType === 'TripPosted') {
    conversionStepsTotal.inc({ flow: 'carrier_activation', step: 'trip_posted' });
  }

  const tripFunded =
    eventType === 'TripUpdated' &&
    (payload.safetyDepositPaid === true ||
      payload.safety_deposit_paid === true ||
      payload?.updates?.safetyDepositPaid === true ||
      payload?.updates?.safety_deposit_paid === true);

  if (tripFunded) {
    conversionStepsTotal.inc({ flow: 'carrier_activation', step: 'deposit_locked' });
  }
}

const requestHandler: http.RequestListener = async (req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ service: 'analytics-pipeline', status: 'ok' }));
    return;
  }

  if (req.url === '/ready') {
    res.writeHead(ready ? 200 : 503, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ service: 'analytics-pipeline', status: ready ? 'ready' : 'degraded' }));
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

  for (const topic of ['trip.lifecycle', 'delivery.lifecycle', 'match.lifecycle', 'payment.lifecycle']) {
    await consumer.subscribe({ topic: topicName(topic), fromBeginning: false });
  }

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
        logger.warn(
          {
            topic,
            value: raw,
            error: String((error as Error)?.message || error || 'Failed to parse Kafka message')
          },
          'analytics_pipeline_parse_failed'
        );
        return;
      }

      lifecycleEventsTotal.inc({
        topic,
        event_type: envelope.event_type
      });
      recordDerivedConversion(envelope.event_type, envelope.payload || {});

      logger.info(
        {
          topic,
          event_type: envelope.event_type,
          aggregate_type: envelope.aggregate_type,
          aggregate_id: envelope.aggregate_id
        },
        'analytics_pipeline_message_processed'
      );
    }
  });

  ready = true;

  server.listen(env.ANALYTICS_PIPELINE_PORT, () => {
    logger.info(
      {
        port: env.ANALYTICS_PIPELINE_PORT
      },
      'analytics_pipeline_started'
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
      error: String((error as Error)?.message || error || 'Failed to bootstrap analytics pipeline')
    },
    'analytics_pipeline_bootstrap_failed'
  );
  process.exit(1);
});

process.on('SIGTERM', () => {
  void shutdown();
});

process.on('SIGINT', () => {
  void shutdown();
});

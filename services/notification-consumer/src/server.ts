import http from 'http';
import Redis from 'ioredis';
import { Consumer, Kafka, logLevel } from 'kafkajs';
import mongoose, { Schema } from 'mongoose';
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

const NotificationSchema = new Schema(
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

const Notification =
  mongoose.models.Notification || mongoose.model('Notification', NotificationSchema);

let consumer: Consumer | null = null;
let ready = false;

const redisUrl = env.REDIS_CACHE_URL || env.REDIS_URL || 'redis://localhost:6379';
const publisher = new Redis(redisUrl, { maxRetriesPerRequest: null });

function topicName(topic: string): string {
  return env.KAFKA_TOPIC_PREFIX ? `${env.KAFKA_TOPIC_PREFIX}.${topic}` : topic;
}

async function publishRealtime(payload: Record<string, any>) {
  await publisher.publish(env.REALTIME_EVENT_CHANNEL, JSON.stringify(payload));
}

async function handleMessage(topic: string, envelope: DomainEventEnvelope) {
  const payload = envelope.payload || {};

  if (topic === topicName('notification.dispatch')) {
    const notification = await Notification.create({
      user: payload.userId,
      title: payload.title,
      body: payload.body,
      type: payload.type,
      metadata: payload.metadata || {}
    });

    await publishRealtime({
      target: { type: 'user', id: String(payload.userId) },
      event: 'notification:new',
      payload: notification.toJSON()
    });
    return;
  }

  if (topic === topicName('realtime.dispatch')) {
    await publishRealtime(payload);
  }
}

const requestHandler: http.RequestListener = async (req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ service: 'notification-consumer', status: 'ok' }));
    return;
  }

  if (req.url === '/ready') {
    const mongoReady = mongoose.connection.readyState === 1;
    const redisReady = publisher.status === 'ready';
    const isReady = ready && mongoReady && redisReady;
    res.writeHead(isReady ? 200 : 503, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        service: 'notification-consumer',
        status: isReady ? 'ready' : 'degraded'
      })
    );
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
  await mongoose.connect(env.MONGODB_URI);

  const kafka = new Kafka({
    clientId: env.KAFKA_CLIENT_ID,
    brokers: env.KAFKA_BROKERS.split(',').map((broker) => broker.trim()),
    logLevel: logLevel.NOTHING
  });

  consumer = kafka.consumer({ groupId: `${env.KAFKA_CLIENT_ID}-group` });
  await consumer.connect();
  consumerConnected.set(1);

  await consumer.subscribe({ topic: topicName('notification.dispatch'), fromBeginning: false });
  await consumer.subscribe({ topic: topicName('realtime.dispatch'), fromBeginning: false });

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
          'notification_consumer_parse_failed'
        );
        return;
      }

      try {
        await handleMessage(topic, envelope);
        messagesProcessedTotal.inc({
          topic,
          event_type: envelope.event_type,
          outcome: 'dispatched'
        });
        logger.info(
          {
            topic,
            event_type: envelope.event_type,
            aggregate_type: envelope.aggregate_type,
            aggregate_id: envelope.aggregate_id
          },
          'notification_consumer_message_processed'
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
            error: String((error as Error)?.message || error || 'Notification dispatch failed')
          },
          'notification_consumer_message_failed'
        );
        throw error;
      }
    }
  });

  ready = true;

  server.listen(env.NOTIFICATION_CONSUMER_PORT, () => {
    logger.info(
      {
        port: env.NOTIFICATION_CONSUMER_PORT,
        topics: [topicName('notification.dispatch'), topicName('realtime.dispatch')]
      },
      'notification_consumer_started'
    );
  });
}

async function shutdown() {
  ready = false;
  consumerConnected.set(0);
  await Promise.allSettled([
    consumer?.disconnect(),
    publisher.quit(),
    mongoose.disconnect(),
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
      error: String((error as Error)?.message || error || 'Failed to bootstrap notification consumer')
    },
    'notification_consumer_bootstrap_failed'
  );
  process.exit(1);
});

process.on('SIGTERM', () => {
  void shutdown();
});

process.on('SIGINT', () => {
  void shutdown();
});

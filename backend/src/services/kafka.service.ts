import { Kafka, Producer } from 'kafkajs';
import { env } from '../config/env';

let producer: Producer | null = null;
let producerPromise: Promise<Producer | null> | null = null;

function getKafkaBrokers() {
  return env.KAFKA_BROKERS?.split(',')
    .map((broker) => broker.trim())
    .filter(Boolean);
}

function getKafkaTopicName(topic: string) {
  return env.KAFKA_TOPIC_PREFIX ? `${env.KAFKA_TOPIC_PREFIX}.${topic}` : topic;
}

export function isKafkaConfigured() {
  return Boolean(getKafkaBrokers()?.length);
}

async function getKafkaProducer() {
  if (!isKafkaConfigured()) {
    return null;
  }

  if (producer) {
    return producer;
  }

  if (!producerPromise) {
    producerPromise = (async () => {
      const kafka = new Kafka({
        clientId: env.KAFKA_CLIENT_ID,
        brokers: getKafkaBrokers() || [],
        ssl: env.KAFKA_SSL,
        sasl:
          env.KAFKA_SASL_USERNAME && env.KAFKA_SASL_PASSWORD
            ? {
                mechanism: 'plain',
                username: env.KAFKA_SASL_USERNAME,
                password: env.KAFKA_SASL_PASSWORD
              }
            : undefined
      });

      const nextProducer = kafka.producer({ allowAutoTopicCreation: true });
      await nextProducer.connect();
      producer = nextProducer;
      return nextProducer;
    })().catch((error) => {
      producerPromise = null;
      throw error;
    });
  }

  return producerPromise;
}

export async function publishKafkaMessage(input: {
  topic: string;
  key?: string;
  value: Record<string, unknown>;
  headers?: Record<string, string>;
}) {
  const kafkaProducer = await getKafkaProducer();

  if (!kafkaProducer) {
    throw new Error('Kafka producer is not configured');
  }

  await kafkaProducer.send({
    topic: getKafkaTopicName(input.topic),
    messages: [
      {
        key: input.key,
        value: JSON.stringify(input.value),
        headers: input.headers
      }
    ]
  });
}

export async function disconnectKafkaProducer() {
  if (producer) {
    await producer.disconnect();
  }

  producer = null;
  producerPromise = null;
}

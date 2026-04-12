import client from 'prom-client';

export const metricsRegistry = new client.Registry();

client.collectDefaultMetrics({
  register: metricsRegistry,
  prefix: 'hopdrop_notification_consumer_'
});

export const consumerConnected = new client.Gauge({
  name: 'hopdrop_notification_consumer_consumer_connected',
  help: 'Whether the notification consumer Kafka consumer is connected'
});

export const messagesProcessedTotal = new client.Counter({
  name: 'hopdrop_notification_consumer_messages_processed_total',
  help: 'Kafka messages processed by topic, event type, and outcome',
  labelNames: ['topic', 'event_type', 'outcome']
});

metricsRegistry.registerMetric(consumerConnected);
metricsRegistry.registerMetric(messagesProcessedTotal);

export async function metricsPayload(): Promise<string> {
  return metricsRegistry.metrics();
}

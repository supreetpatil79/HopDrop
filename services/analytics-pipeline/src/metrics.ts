import client from 'prom-client';

export const metricsRegistry = new client.Registry();

client.collectDefaultMetrics({
  register: metricsRegistry,
  prefix: 'hopdrop_analytics_pipeline_'
});

export const consumerConnected = new client.Gauge({
  name: 'hopdrop_analytics_pipeline_consumer_connected',
  help: 'Whether the analytics pipeline Kafka consumer is connected'
});

export const lifecycleEventsTotal = new client.Counter({
  name: 'hopdrop_analytics_pipeline_lifecycle_events_total',
  help: 'Lifecycle events observed by topic and event type',
  labelNames: ['topic', 'event_type']
});

export const conversionStepsTotal = new client.Counter({
  name: 'hopdrop_analytics_pipeline_conversion_steps_total',
  help: 'Derived conversion steps observed from lifecycle events',
  labelNames: ['flow', 'step']
});

metricsRegistry.registerMetric(consumerConnected);
metricsRegistry.registerMetric(lifecycleEventsTotal);
metricsRegistry.registerMetric(conversionStepsTotal);

export async function metricsPayload(): Promise<string> {
  return metricsRegistry.metrics();
}

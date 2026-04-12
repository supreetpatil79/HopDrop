import type { Request } from 'express';
import client from 'prom-client';

export const metricsRegistry = new client.Registry();

client.collectDefaultMetrics({
  register: metricsRegistry,
  prefix: 'hopdrop_core_api_'
});

export const httpRequestsTotal = new client.Counter({
  name: 'hopdrop_core_api_http_requests_total',
  help: 'Total HTTP requests processed by the core API',
  labelNames: ['method', 'route', 'status_code']
});

export const httpRequestDurationSeconds = new client.Histogram({
  name: 'hopdrop_core_api_http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.025, 0.05, 0.1, 0.25, 0.5, 1, 2, 5, 10]
});

export const httpErrorsTotal = new client.Counter({
  name: 'hopdrop_core_api_http_errors_total',
  help: 'HTTP errors returned by the core API',
  labelNames: ['method', 'route', 'status_code']
});

export const outboxEventsAppendedTotal = new client.Counter({
  name: 'hopdrop_core_api_outbox_events_appended_total',
  help: 'Outbox events appended by topic and event type',
  labelNames: ['topic', 'event_type']
});

export const outboxEventsPublishedTotal = new client.Counter({
  name: 'hopdrop_core_api_outbox_events_published_total',
  help: 'Outbox events successfully published to Kafka',
  labelNames: ['topic', 'event_type']
});

export const outboxEventsFailedTotal = new client.Counter({
  name: 'hopdrop_core_api_outbox_events_failed_total',
  help: 'Outbox publish failures by topic and event type',
  labelNames: ['topic', 'event_type']
});

metricsRegistry.registerMetric(httpRequestsTotal);
metricsRegistry.registerMetric(httpRequestDurationSeconds);
metricsRegistry.registerMetric(httpErrorsTotal);
metricsRegistry.registerMetric(outboxEventsAppendedTotal);
metricsRegistry.registerMetric(outboxEventsPublishedTotal);
metricsRegistry.registerMetric(outboxEventsFailedTotal);

export function getMetricsRoute(req: Request) {
  if (req.route?.path) {
    return `${req.baseUrl || ''}${req.route.path}`;
  }

  return req.path;
}

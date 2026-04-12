import client from 'prom-client';

export const metricsRegistry = new client.Registry();

client.collectDefaultMetrics({
  register: metricsRegistry,
  prefix: 'hopdrop_realtime_gateway_'
});

export const httpRequestsTotal = new client.Counter({
  name: 'hopdrop_realtime_gateway_http_requests_total',
  help: 'Total HTTP requests processed by the realtime gateway',
  labelNames: ['method', 'route', 'status_code']
});

export const httpRequestDurationSeconds = new client.Histogram({
  name: 'hopdrop_realtime_gateway_http_request_duration_seconds',
  help: 'HTTP request duration in seconds for the realtime gateway',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1]
});

export const activeSocketConnections = new client.Gauge({
  name: 'hopdrop_realtime_gateway_active_socket_connections',
  help: 'Active Socket.IO connections on the realtime gateway'
});

metricsRegistry.registerMetric(httpRequestsTotal);
metricsRegistry.registerMetric(httpRequestDurationSeconds);
metricsRegistry.registerMetric(activeSocketConnections);

export async function metricsPayload(): Promise<string> {
  return metricsRegistry.metrics();
}

export function recordHttpRequest(method: string, route: string, statusCode: number, durationSeconds: number): void {
  const labels = {
    method,
    route,
    status_code: String(statusCode)
  };

  httpRequestsTotal.inc(labels);
  httpRequestDurationSeconds.observe(labels, durationSeconds);
}

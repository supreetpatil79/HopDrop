import type { Request } from 'express';
import client from 'prom-client';
import { matchQueue, otpCleanupQueue, payoutQueue, reminderQueue } from '../config/redis';

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

export const queueJobs = new client.Gauge({
  name: 'hopdrop_core_api_queue_jobs',
  help: 'Current BullMQ jobs by queue and state',
  labelNames: ['queue', 'state']
});

export const queueJobOutcomesTotal = new client.Counter({
  name: 'hopdrop_core_api_queue_job_outcomes_total',
  help: 'BullMQ jobs observed by queue and outcome',
  labelNames: ['queue', 'outcome']
});

export const queueMetricsRefreshFailuresTotal = new client.Counter({
  name: 'hopdrop_core_api_queue_metrics_refresh_failures_total',
  help: 'Failures while refreshing BullMQ queue metrics',
  labelNames: ['queue']
});

metricsRegistry.registerMetric(httpRequestsTotal);
metricsRegistry.registerMetric(httpRequestDurationSeconds);
metricsRegistry.registerMetric(httpErrorsTotal);
metricsRegistry.registerMetric(outboxEventsAppendedTotal);
metricsRegistry.registerMetric(outboxEventsPublishedTotal);
metricsRegistry.registerMetric(outboxEventsFailedTotal);
metricsRegistry.registerMetric(queueJobs);
metricsRegistry.registerMetric(queueJobOutcomesTotal);
metricsRegistry.registerMetric(queueMetricsRefreshFailuresTotal);

const trackedQueues = [
  { label: 'match', queue: matchQueue },
  { label: 'otp_cleanup', queue: otpCleanupQueue },
  { label: 'payout', queue: payoutQueue },
  { label: 'reminder', queue: reminderQueue }
] as const;

type QueueMetricState = 'waiting' | 'active' | 'delayed' | 'failed';
type QueueOutcome = 'completed' | 'failed';

function setQueueState(queue: string, state: QueueMetricState, value: number) {
  queueJobs.set({ queue, state }, value);
}

function supportsJobCounts(queue: unknown): queue is { getJobCounts: (...types: string[]) => Promise<Record<string, number>> } {
  return Boolean(queue) && typeof (queue as { getJobCounts?: unknown }).getJobCounts === 'function';
}

async function refreshTrackedQueueMetrics(queueLabel: string, queue: unknown) {
  if (!supportsJobCounts(queue)) {
    setQueueState(queueLabel, 'waiting', 0);
    setQueueState(queueLabel, 'active', 0);
    setQueueState(queueLabel, 'delayed', 0);
    setQueueState(queueLabel, 'failed', 0);
    return;
  }

  try {
    const counts = await queue.getJobCounts('wait', 'active', 'delayed', 'failed');
    setQueueState(queueLabel, 'waiting', counts.wait ?? 0);
    setQueueState(queueLabel, 'active', counts.active ?? 0);
    setQueueState(queueLabel, 'delayed', counts.delayed ?? 0);
    setQueueState(queueLabel, 'failed', counts.failed ?? 0);
  } catch {
    queueMetricsRefreshFailuresTotal.inc({ queue: queueLabel });
  }
}

export async function refreshQueueMetrics() {
  await Promise.all(trackedQueues.map(({ label, queue }) => refreshTrackedQueueMetrics(label, queue)));
}

export function recordQueueJobOutcome(queue: string, outcome: QueueOutcome) {
  queueJobOutcomesTotal.inc({ queue, outcome });
}

export function getMetricsRoute(req: Request) {
  if (req.route?.path) {
    return `${req.baseUrl || ''}${req.route.path}`;
  }

  return req.path;
}

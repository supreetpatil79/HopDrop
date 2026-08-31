import { context, propagation, trace } from '@opentelemetry/api';

/**
 * Inject the current OpenTelemetry trace context into a BullMQ job data payload.
 * Call this when adding a job so the worker can resume the same trace.
 *
 * Usage:
 *   await payoutQueue.add('release-payout', {
 *     matchId,
 *     ...injectTraceContext()
 *   });
 */
export function injectTraceContext(): Record<string, string> {
  const carrier: Record<string, string> = {};
  propagation.inject(context.active(), carrier);
  return { _otelCarrier: JSON.stringify(carrier) };
}

/**
 * Extract and activate the OTel trace context from a BullMQ job data payload.
 * Call this at the start of a worker handler to resume the originating trace.
 *
 * Usage:
 *   const ctx = extractTraceContext(job.data);
 *   return context.with(ctx, async () => { ... your worker logic ... });
 */
export function extractTraceContext(jobData: Record<string, unknown>): ReturnType<typeof context.active> {
  try {
    const raw = jobData._otelCarrier;
    if (typeof raw === 'string') {
      const carrier = JSON.parse(raw) as Record<string, string>;
      return propagation.extract(context.active(), carrier);
    }
  } catch {
    // Malformed carrier — fall back to root context
  }
  return context.active();
}

/**
 * Get a tracer for the given instrumentation scope.
 */
export function getTracer(name: string) {
  return trace.getTracer(name, '1.0.0');
}
